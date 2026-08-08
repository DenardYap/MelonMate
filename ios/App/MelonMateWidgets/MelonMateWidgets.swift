import SwiftUI
import WidgetKit

private let quickLogURL = URL(string: "melonmate://add?source=lock-screen-widget")!

struct QuickLogEntry: TimelineEntry {
    let date: Date
}

struct QuickLogProvider: TimelineProvider {
    func placeholder(in context: Context) -> QuickLogEntry {
        QuickLogEntry(date: Date())
    }

    func getSnapshot(in context: Context, completion: @escaping (QuickLogEntry) -> Void) {
        completion(QuickLogEntry(date: Date()))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<QuickLogEntry>) -> Void) {
        let entry = QuickLogEntry(date: Date())
        let refresh = Calendar.current.date(byAdding: .day, value: 1, to: entry.date) ?? entry.date
        completion(Timeline(entries: [entry], policy: .after(refresh)))
    }
}

struct QuickFoodLogView: View {
    @Environment(\.widgetFamily) private var family
    @Environment(\.locale) private var locale

    private var isChinese: Bool {
        locale.language.languageCode?.identifier == "zh"
    }

    private var title: String {
        isChinese ? "記錄飲食" : "Log food"
    }

    var body: some View {
        Group {
            switch family {
            case .accessoryCircular:
                ZStack {
                    AccessoryWidgetBackground()
                    VStack(spacing: 1) {
                        Image(systemName: "fork.knife")
                            .font(.system(size: 18, weight: .bold))
                        Text(isChinese ? "記錄" : "LOG")
                            .font(.system(size: 8, weight: .black, design: .rounded))
                    }
                }
            case .accessoryRectangular:
                HStack(spacing: 8) {
                    Image(systemName: "fork.knife.circle.fill")
                        .font(.system(size: 27, weight: .semibold))
                    VStack(alignment: .leading, spacing: 1) {
                        Text(title)
                            .font(.system(size: 14, weight: .bold, design: .rounded))
                        Text(isChinese ? "點一下快速開啟" : "Tap to open MelonMate")
                            .font(.system(size: 10, weight: .medium, design: .rounded))
                    }
                    Spacer(minLength: 0)
                }
            case .accessoryInline:
                Label(title, systemImage: "fork.knife")
            default:
                VStack(alignment: .leading, spacing: 10) {
                    Image(systemName: "fork.knife.circle.fill")
                        .font(.system(size: 34, weight: .bold))
                        .foregroundStyle(Color(red: 0.39, green: 0.62, blue: 0.25))
                    Spacer(minLength: 0)
                    Text(title)
                        .font(.system(size: 18, weight: .bold, design: .rounded))
                    Text(isChinese ? "快速開啟 MelonMate" : "Open MelonMate instantly")
                        .font(.system(size: 11, weight: .medium, design: .rounded))
                        .foregroundStyle(.secondary)
                }
                .padding(16)
            }
        }
        .widgetURL(quickLogURL)
        .quickLogWidgetBackground()
        .accessibilityLabel(title)
    }
}

private extension View {
    @ViewBuilder
    func quickLogWidgetBackground() -> some View {
        if #available(iOSApplicationExtension 17.0, *) {
            containerBackground(for: .widget) {
                Color(red: 0.94, green: 0.97, blue: 0.88)
            }
        } else {
            background(Color(red: 0.94, green: 0.97, blue: 0.88))
        }
    }
}

struct QuickFoodLogWidget: Widget {
    let kind = "QuickFoodLogWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: QuickLogProvider()) { _ in
            QuickFoodLogView()
        }
        .configurationDisplayName("Quick Food Log")
        .description("Open MelonMate food logging from your Lock Screen.")
        .supportedFamilies([
            .accessoryCircular,
            .accessoryRectangular,
            .accessoryInline,
            .systemSmall,
        ])
    }
}

@main
struct MelonMateWidgets: WidgetBundle {
    var body: some Widget {
        QuickFoodLogWidget()
    }
}
