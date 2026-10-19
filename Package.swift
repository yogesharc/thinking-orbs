// swift-tools-version:5.9
// The Swift port of the orbs. It lives under packages/swift, but SwiftPM only reads a manifest at a repository's root.
import PackageDescription

let package = Package(
    name: "ThinkingOrbs",
    platforms: [.iOS(.v17), .macOS(.v14)],
    products: [.library(name: "ThinkingOrbs", targets: ["ThinkingOrbs"])],
    targets: [
        .target(name: "ThinkingOrbs", path: "packages/swift/Sources/ThinkingOrbs"),
        .executableTarget(name: "OrbGallery", dependencies: ["ThinkingOrbs"], path: "packages/swift/Sources/OrbGallery"),
    ]
)
