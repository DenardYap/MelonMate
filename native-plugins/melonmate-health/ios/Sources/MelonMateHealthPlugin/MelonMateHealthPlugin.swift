import Capacitor
import Foundation
import HealthKit

@objc(MelonMateHealthPlugin)
public final class MelonMateHealthPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "MelonMateHealthPlugin"
    public let jsName = "MelonMateHealth"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "isAvailable", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "requestActivityAuthorization", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "readDailyActivity", returnType: CAPPluginReturnPromise)
    ]

    private let healthStore = HKHealthStore()

    @objc public func isAvailable(_ call: CAPPluginCall) {
        call.resolve(["available": HKHealthStore.isHealthDataAvailable()])
    }

    @objc public func requestActivityAuthorization(_ call: CAPPluginCall) {
        guard HKHealthStore.isHealthDataAvailable() else {
            call.resolve(["authorized": false])
            return
        }

        var readTypes = Set<HKObjectType>()
        if let steps = HKObjectType.quantityType(forIdentifier: .stepCount) {
            readTypes.insert(steps)
        }
        if let standTime = HKObjectType.quantityType(forIdentifier: .appleStandTime) {
            readTypes.insert(standTime)
        }

        healthStore.requestAuthorization(toShare: [], read: readTypes) { success, error in
            DispatchQueue.main.async {
                if let error {
                    call.reject("Health authorization failed", nil, error)
                } else {
                    // HealthKit intentionally does not reveal whether read access was denied.
                    // A successful request means the permission sheet was processed; denied
                    // types simply return no samples from the read query.
                    call.resolve(["authorized": success])
                }
            }
        }
    }

    @objc public func readDailyActivity(_ call: CAPPluginCall) {
        guard HKHealthStore.isHealthDataAvailable() else {
            call.reject("HealthKit is unavailable", "HEALTH_UNAVAILABLE")
            return
        }
        guard let rawDate = call.getString("date"), let interval = dayInterval(rawDate) else {
            call.reject("Use a date in YYYY-MM-DD format", "BAD_DATE")
            return
        }
        guard
            let stepType = HKObjectType.quantityType(forIdentifier: .stepCount),
            let standType = HKObjectType.quantityType(forIdentifier: .appleStandTime)
        else {
            call.reject("Required HealthKit activity types are unavailable", "TYPE_UNAVAILABLE")
            return
        }

        let group = DispatchGroup()
        var steps = 0.0
        var standMinutes = 0.0
        var queryError: Error?

        group.enter()
        sum(type: stepType, unit: .count(), interval: interval) { value, error in
            steps = value
            queryError = queryError ?? error
            group.leave()
        }

        group.enter()
        sum(type: standType, unit: .minute(), interval: interval) { value, error in
            standMinutes = value
            queryError = queryError ?? error
            group.leave()
        }

        group.notify(queue: .main) {
            if let queryError {
                call.reject("Health activity query failed", nil, queryError)
                return
            }
            call.resolve([
                "steps": max(0, Int(steps.rounded(.down))),
                "standMinutes": max(0, Int(standMinutes.rounded(.down)))
            ])
        }
    }

    private func dayInterval(_ rawDate: String) -> DateInterval? {
        let formatter = DateFormatter()
        formatter.calendar = Calendar(identifier: .gregorian)
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.timeZone = .current
        formatter.dateFormat = "yyyy-MM-dd"
        guard let start = formatter.date(from: rawDate) else { return nil }
        return Calendar.current.dateInterval(of: .day, for: start)
    }

    private func sum(
        type: HKQuantityType,
        unit: HKUnit,
        interval: DateInterval,
        completion: @escaping (Double, Error?) -> Void
    ) {
        let predicate = HKQuery.predicateForSamples(
            withStart: interval.start,
            end: interval.end,
            options: [.strictStartDate, .strictEndDate]
        )
        let query = HKStatisticsQuery(
            quantityType: type,
            quantitySamplePredicate: predicate,
            options: .cumulativeSum
        ) { _, statistics, error in
            completion(statistics?.sumQuantity()?.doubleValue(for: unit) ?? 0, error)
        }
        healthStore.execute(query)
    }
}
