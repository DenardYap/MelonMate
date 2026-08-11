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
        CAPPluginMethod(name: "setVolume", returnType: CAPPluginReturnPromise)
    ]

    private static let allowedFiles: Set<String> = [
        "01-melon-morning.mp3",
        "02-garden-bounce.mp3",
        "03-firefly-supper.mp3"
    ]

    private var player: AVAudioPlayer?
    private var currentFile: String?

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

    private func themeURL(_ filename: String) -> URL? {
        guard let resources = Bundle.main.resourceURL else { return nil }
        let url = resources
            .appendingPathComponent("public", isDirectory: true)
            .appendingPathComponent("audio", isDirectory: true)
            .appendingPathComponent("theme-samples", isDirectory: true)
            .appendingPathComponent(filename)
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
    }
}
