import SwiftUI

/// An animated status indicator for what an AI agent is doing: a `state`, and optionally one of that
/// state's `variant`s. It draws in the foreground style, so `.foregroundStyle(.blue)` tints it, and every
/// orb is tuned to read at 20pt. `paused` holds it on its frame. With Reduce Motion it holds still.
public struct Orb: View {
    let config: OrbConfig, speed: Double, paused: Bool, label: String?
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var holder = Holder()

    /// - Parameters:
    ///   - size: Width and height in points.
    ///   - speed: 1 is as designed, 0.5 half speed, 2 double. Every motion scales together.
    ///   - label: What VoiceOver reads, like "Thinking". Without one the orb is hidden from it.
    ///   - density: How many dots, as a multiple of the tuned count.
    ///   - dotSize: How big each dot is, as a multiple of the tuned size.
    ///   - tilt: How far it's seen from above, in degrees: 0 side on, 90 straight down.
    ///   - direction: Which way Using · Scroll scrolls, and which side Using clicks on. Without one they go anywhere.
    public init(
        state: OrbState = .idle, variant: OrbVariant = .default, size: CGFloat = 20, speed: Double = 1, paused: Bool = false,
        label: String? = nil, density: Double = 1, dotSize: Double = 1, tilt: Double = 20, direction: OrbDirection? = nil
    ) {
        config = OrbConfig(look: Look(state, variant), size: size, density: density, dotSize: dotSize, tilt: tilt, direction: direction)
        self.speed = speed
        self.paused = paused
        self.label = label
    }

    public var body: some View {
        let engine = holder.engine(for: config), still = reduceMotion, speed = speed
        let clock = "\(config.look.rawValue)@\(speed)"
        // One timeline per orb and no timers: SwiftUI drives them all off the display's own refresh.
        TimelineView(.animation(paused: paused || still)) { timeline in
            Canvas { context, _ in
                let t = still ? 0 : tick(clock, timeline.date.timeIntervalSinceReferenceDate * 1000, speed)
                engine.render(t, into: &context)
            }
        }
        .frame(width: config.size, height: config.size)
        .accessibilityElement()
        .accessibilityLabel(label ?? "")
        .accessibilityAddTraits(.isImage)
        .accessibilityHidden(label == nil)
    }
}

/// Keeps a view's engine across redraws, and makes a new one when what sets the dots changes.
private final class Holder {
    private var engine: OrbEngine?
    func engine(for config: OrbConfig) -> OrbEngine {
        if let engine, engine.config == config { return engine }
        let made = OrbEngine(config)
        engine = made
        return made
    }
}

extension OrbEngine {
    /// A circle per dot, at its opacity to two places like the web's. No dot drops below 0.45pt, or it renders as a grey haze.
    /// Dots of one opacity go in one path, so a frame is at most 100 fills however many dots it has.
    func render(_ t: Double, into context: inout GraphicsContext) {
        var paths = [Path](repeating: Path(), count: 101)
        draw(t) { x, y, r, a in
            let o = min(100, Int((a * 100).rounded()))
            guard o > 0 else { return }
            let r = max(0.45, r)
            paths[o].addEllipse(in: CGRect(x: x - r, y: y - r, width: 2 * r, height: 2 * r))
        }
        for (o, path) in paths.enumerated() where !path.isEmpty {
            context.opacity = Double(o) / 100
            context.fill(path, with: .foreground)
        }
    }
}
