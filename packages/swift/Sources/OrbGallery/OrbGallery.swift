import SwiftUI
import ThinkingOrbs

/// Every state and variant, big and at the 20pt they're tuned for, to hold up against thinkingorbs.com/playground.
/// `swift run OrbGallery` opens it on the Mac; in Xcode the preview below shows it on iOS.
struct Gallery: View {
    static let looks = OrbState.allCases.flatMap { state in state.variants.map { (state, $0) } }

    var body: some View {
        List(Self.looks.indices, id: \.self) { i in
            let (state, variant) = Self.looks[i]
            HStack(spacing: 24) {
                Orb(state: state, variant: variant, size: 64)
                HStack(spacing: 8) {
                    Orb(state: state, variant: variant)
                    Text(variant == .default ? state.rawValue.capitalized : "\(state.rawValue.capitalized) · \(variant.rawValue.capitalized)")
                }
            }
        }
    }
}

@main
struct OrbGalleryApp: App {
    init() {
        #if os(macOS)
        // Run from the command line it isn't an app bundle, so ask for a window and a Dock icon.
        NSApplication.shared.setActivationPolicy(.regular)
        #endif
    }

    var body: some Scene {
        WindowGroup("Thinking Orbs") { Gallery() }
    }
}

#Preview { Gallery() }
