import AVFoundation
import Capacitor
import MediaPlayer

@objc(MelonMateAudioPlugin)
final class MelonMateAudioPlugin: CAPPlugin, CAPBridgedPlugin {
    let identifier = "MelonMateAudioPlugin"
    let jsName = "MelonMateAudio"
    let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "playTheme", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "pauseTheme", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "stopTheme", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "setVolume", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "playEffect", returnType: CAPPluginReturnPromise)
    ]

    private static let allowedFiles: Set<String> = [
        "01-townie-loop.mp3",
        "02-sidewalk-shade-slower.mp3",
        "03-bossa-antigua.mp3",
        "04-fuzzball-parade.mp3",
        "05-wholesome.mp3",
        "06-farm.mp3",
        "07-local-forecast-slower.mp3",
        "08-lobby-time.mp3",
        "09-casa-bossa-nova.mp3",
        "10-morning.mp3",
        "11-northern-glade.mp3",
        "12-evening.mp3"
    ]
    private static let allowedEffectFiles: Set<String> = [
        "click.wav", "plant.wav", "harvest.wav", "spell.wav", "level-up.wav",
        "success.wav", "error.wav", "expand.wav", "scan.wav", "timer.wav"
    ]

    private var player: AVAudioPlayer?
    private var currentFile: String?
    private var effectPlayers: [UUID: AVAudioPlayer] = [:]

    @objc func playTheme(_ call: CAPPluginCall) {
        guard
            let filename = call.getString("filename"),
            Self.allowedFiles.contains(filename)
        else {
            call.reject("Unknown theme file", "INVALID_THEME")
            return
        }
        let volume = Float(min(1, max(0, call.getDouble("volume") ?? 0.17)))

        DispatchQueue.main.async { [weak self] in
            guard let self else {
                call.reject("Audio player is unavailable", "PLAYER_UNAVAILABLE")
                return
            }
            do {
                try self.configurePlaybackSession()
                if self.currentFile == filename, let player = self.player {
                    player.volume = volume
                    if !player.isPlaying, !player.play() {
                        call.reject("Theme playback could not resume", "PLAYBACK_FAILED")
                        return
                    }
                    self.clearNowPlaying()
                    call.resolve(["playing": true])
                    return
                }

                guard let url = self.themeURL(filename) else {
                    call.reject("Theme asset is missing from the app bundle", "ASSET_MISSING")
                    return
                }
                self.player?.stop()
                let player = try AVAudioPlayer(contentsOf: url)
                player.numberOfLoops = -1
                player.volume = volume
                player.prepareToPlay()
                guard player.play() else {
                    call.reject("Theme playback could not start", "PLAYBACK_FAILED")
                    return
                }
                self.player = player
                self.currentFile = filename
                self.clearNowPlaying()
                NSLog("MelonMateAudio: playing %@", filename)
                call.resolve(["playing": true])
            } catch {
                call.reject("Theme playback failed", "AUDIO_ERROR", error)
            }
        }
    }

    @objc func pauseTheme(_ call: CAPPluginCall) {
        DispatchQueue.main.async { [weak self] in
            self?.player?.pause()
            call.resolve()
        }
    }

    @objc func stopTheme(_ call: CAPPluginCall) {
        DispatchQueue.main.async { [weak self] in
            self?.stopPlayback()
            call.resolve()
        }
    }

    @objc func setVolume(_ call: CAPPluginCall) {
        let volume = Float(min(1, max(0, call.getDouble("volume") ?? 0.17)))
        DispatchQueue.main.async { [weak self] in
            self?.player?.volume = volume
            call.resolve()
        }
    }

    @objc func playEffect(_ call: CAPPluginCall) {
        guard
            let filename = call.getString("filename"),
            Self.allowedEffectFiles.contains(filename)
        else {
            call.reject("Unknown effect file", "INVALID_EFFECT")
            return
        }
        let volume = Float(min(1, max(0, call.getDouble("volume") ?? 0.75)))

        DispatchQueue.main.async { [weak self] in
            guard let self else {
                call.reject("Audio player is unavailable", "PLAYER_UNAVAILABLE")
                return
            }
            do {
                try self.configurePlaybackSession()
                guard let url = self.audioURL(filename, subdirectory: "audio") else {
                    call.reject("Effect asset is missing from the app bundle", "ASSET_MISSING")
                    return
                }
                let effect = try AVAudioPlayer(contentsOf: url)
                let id = UUID()
                effect.volume = volume
                effect.prepareToPlay()
                guard effect.play() else {
                    call.reject("Effect playback could not start", "PLAYBACK_FAILED")
                    return
                }
                self.effectPlayers[id] = effect
                DispatchQueue.main.asyncAfter(deadline: .now() + effect.duration + 0.2) { [weak self] in
                    self?.effectPlayers.removeValue(forKey: id)
                }
                call.resolve(["playing": true])
            } catch {
                call.reject("Effect playback failed", "AUDIO_ERROR", error)
            }
        }
    }

    private func themeURL(_ filename: String) -> URL? {
        audioURL(filename, subdirectory: "audio/theme-samples")
    }

    private func audioURL(_ filename: String, subdirectory: String) -> URL? {
        guard let resources = Bundle.main.resourceURL else { return nil }
        let directory = subdirectory.split(separator: "/").reduce(
            resources.appendingPathComponent("public", isDirectory: true)
        ) { url, component in
            url.appendingPathComponent(String(component), isDirectory: true)
        }
        let url = directory.appendingPathComponent(filename)
        return FileManager.default.fileExists(atPath: url.path) ? url : nil
    }

    private func configurePlaybackSession() throws {
        let session = AVAudioSession.sharedInstance()
        try session.setCategory(.playback, mode: .default, options: [.mixWithOthers])
        try session.setActive(true)
    }

    private func clearNowPlaying() {
        MPNowPlayingInfoCenter.default().nowPlayingInfo = nil
        let commands = MPRemoteCommandCenter.shared()
        commands.playCommand.isEnabled = false
        commands.pauseCommand.isEnabled = false
        commands.togglePlayPauseCommand.isEnabled = false
        commands.nextTrackCommand.isEnabled = false
        commands.previousTrackCommand.isEnabled = false
    }

    private func stopPlayback() {
        player?.stop()
        player = nil
        currentFile = nil
        clearNowPlaying()
        try? AVAudioSession.sharedInstance().setActive(false, options: [.notifyOthersOnDeactivation])
    }
}

final class MelonMateBridgeViewController: CAPBridgeViewController {
    override func capacitorDidLoad() {
        bridge?.registerPluginInstance(MelonMateAudioPlugin())
        bridge?.registerPluginInstance(MelonMateAppearancePlugin())
        bridge?.registerPluginInstance(MelonMateWorkoutActivityPlugin())
    }
}
