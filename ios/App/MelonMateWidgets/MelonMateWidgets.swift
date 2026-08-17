import ActivityKit
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

@available(iOSApplicationExtension 16.2, *)
private struct WorkoutActivityStatusView: View {
    let context: ActivityViewContext<WorkoutActivityAttributes>
    var compact = false

    private var isChinese: Bool { context.state.language == "zh" }

    var body: some View {
        if context.state.isResting {
            if context.isStale {
                HStack(spacing: compact ? 2 : 5) {
                    Image(systemName: "sparkles")
                    Text(isChinese ? "開始!!" : "GO!!")
                }
                .font(.system(size: compact ? 13 : 24, weight: .black, design: .rounded))
                .foregroundStyle(Color(red: 0.39, green: 0.62, blue: 0.25))
            } else if let restEndsAt = context.state.restEndsAt {
                let now = Date.now
                let safeEnd = max(now, restEndsAt)
                VStack(alignment: compact ? .trailing : .leading, spacing: 1) {
                    if !compact {
                        Text(isChinese ? "休息" : "REST")
                            .font(.system(size: 10, weight: .black, design: .rounded))
                            .foregroundStyle(.secondary)
                    }
                    Text(timerInterval: now...safeEnd, pauseTime: safeEnd, countsDown: true, showsHours: false)
                        .font(.system(size: compact ? 13 : 25, weight: .black, design: .rounded))
                        .monospacedDigit()
                }
            }
        } else if compact {
            Text("\(context.state.completedSets)/\(context.state.totalSets)")
                .font(.system(size: 12, weight: .bold, design: .rounded))
                .monospacedDigit()
        } else {
            VStack(alignment: .leading, spacing: 1) {
                Text(isChinese ? "訓練時間" : "WORKOUT TIME")
                    .font(.system(size: 10, weight: .black, design: .rounded))
                    .foregroundStyle(.secondary)
                Text(context.attributes.startedAt, style: .timer)
                    .font(.system(size: 22, weight: .bold, design: .rounded))
                    .monospacedDigit()
            }
        }
    }
}

@available(iOSApplicationExtension 16.2, *)
private struct WorkoutLockScreenActivityView: View {
    let context: ActivityViewContext<WorkoutActivityAttributes>

    private var isChinese: Bool { context.state.language == "zh" }

    var body: some View {
        HStack(spacing: 14) {
            VStack(alignment: .leading, spacing: 7) {
                HStack(spacing: 6) {
                    Image(systemName: "figure.strengthtraining.traditional")
                        .font(.system(size: 15, weight: .bold))
                        .foregroundStyle(Color(red: 0.39, green: 0.62, blue: 0.25))
                    Text(context.attributes.workoutName)
                        .font(.system(size: 16, weight: .bold, design: .rounded))
                        .lineLimit(1)
                }
                ProgressView(
                    value: Double(context.state.completedSets),
                    total: Double(max(1, context.state.totalSets))
                )
                .tint(Color(red: 0.39, green: 0.62, blue: 0.25))
                Text(isChinese
                     ? "\(context.state.completedSets) / \(context.state.totalSets) 組"
                     : "\(context.state.completedSets) / \(context.state.totalSets) sets")
                    .font(.system(size: 11, weight: .semibold, design: .rounded))
                    .foregroundStyle(.secondary)
            }
            .frame(maxWidth: .infinity, alignment: .leading)

            WorkoutActivityStatusView(context: context)
                .frame(minWidth: 82, alignment: .leading)
        }
        .padding(16)
        .widgetURL(URL(string: "melonmate://gym/session?source=live-activity"))
    }
}

@available(iOSApplicationExtension 16.2, *)
private struct WorkoutLiveActivityWidget: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: WorkoutActivityAttributes.self) { context in
            WorkoutLockScreenActivityView(context: context)
                .activityBackgroundTint(Color(red: 0.94, green: 0.97, blue: 0.88))
                .activitySystemActionForegroundColor(Color(red: 0.24, green: 0.40, blue: 0.16))
        } dynamicIsland: { context in
            DynamicIsland {
                DynamicIslandExpandedRegion(.leading) {
                    Label("MelonMate", systemImage: "figure.strengthtraining.traditional")
                        .font(.system(size: 13, weight: .bold, design: .rounded))
                        .foregroundStyle(Color(red: 0.39, green: 0.62, blue: 0.25))
                }
                DynamicIslandExpandedRegion(.trailing) {
                    WorkoutActivityStatusView(context: context, compact: true)
                }
                DynamicIslandExpandedRegion(.bottom) {
                    VStack(alignment: .leading, spacing: 6) {
                        Text(context.attributes.workoutName)
                            .font(.system(size: 14, weight: .bold, design: .rounded))
                            .lineLimit(1)
                        ProgressView(
                            value: Double(context.state.completedSets),
                            total: Double(max(1, context.state.totalSets))
                        )
                        .tint(Color(red: 0.39, green: 0.62, blue: 0.25))
                    }
                }
            } compactLeading: {
                Image(systemName: "figure.strengthtraining.traditional")
                    .foregroundStyle(Color(red: 0.39, green: 0.62, blue: 0.25))
            } compactTrailing: {
                WorkoutActivityStatusView(context: context, compact: true)
            } minimal: {
                Image(systemName: context.isStale && context.state.isResting ? "sparkles" : "figure.strengthtraining.traditional")
                    .foregroundStyle(Color(red: 0.39, green: 0.62, blue: 0.25))
            }
            .widgetURL(URL(string: "melonmate://gym/session?source=live-activity"))
            .keylineTint(Color(red: 0.39, green: 0.62, blue: 0.25))
        }
    }
}

@main
struct MelonMateWidgets: WidgetBundle {
    var body: some Widget {
        QuickFoodLogWidget()
        if #available(iOSApplicationExtension 16.2, *) {
            WorkoutLiveActivityWidget()
        }
    }
}
