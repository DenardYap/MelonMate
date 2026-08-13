import Capacitor
import UIKit

@objc(MelonMateAppearancePlugin)
final class MelonMateAppearancePlugin: CAPPlugin, CAPBridgedPlugin {
    let identifier = "MelonMateAppearancePlugin"
    let jsName = "MelonMateAppearance"
    let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "setAppIcon", returnType: CAPPluginReturnPromise)
    ]

    @objc func setAppIcon(_ call: CAPPluginCall) {
        guard let theme = call.getString("theme") else {
            call.reject("Theme is required", "INVALID_THEME")
            return
        }

        let iconName: String?
        switch theme {
        case "honeydew": iconName = nil
        case "watermelon": iconName = "AppIconWatermelon"
        case "cantaloupe": iconName = "AppIconCantaloupe"
        case "canary": iconName = "AppIconCanary"
        case "hami": iconName = "AppIconHami"
        case "chamoe": iconName = "AppIconChamoe"
        case "moon-gold": iconName = "AppIconMoonGold"
        case "densuke": iconName = "AppIconDensuke"
        default:
            call.reject("Unknown theme", "INVALID_THEME")
            return
        }

        DispatchQueue.main.async {
            let application = UIApplication.shared
            guard application.supportsAlternateIcons else {
                call.resolve(["supported": false, "changed": false])
                return
            }
            if application.alternateIconName == iconName {
                call.resolve(["supported": true, "changed": false])
                return
            }
            application.setAlternateIconName(iconName) { error in
                if let error {
                    call.reject("App icon could not be changed", "ICON_CHANGE_FAILED", error)
                } else {
                    call.resolve(["supported": true, "changed": true])
                }
            }
        }
    }
}
