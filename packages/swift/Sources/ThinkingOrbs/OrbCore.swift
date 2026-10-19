// A line-for-line port of apps/web/registry/orb/orb-core.ts, so the two draw the same frame at the same time.
// Change the drawing there first, then here.
import Foundation

/// One state per thing an agent does. `variants` lists the looks each comes in, `default` first.
public enum OrbState: String, CaseIterable, Sendable {
    case idle, working, reasoning, searching, background, retrying, compacting, waiting, using

    public var variants: [OrbVariant] {
        switch self {
        case .idle: [.default, .blink]
        case .working: [.default, .gyro]
        case .reasoning: [.default, .twins]
        case .searching: [.default, .lighthouse]
        case .background: [.default, .spiral]
        case .retrying: [.default, .surge]
        case .compacting: [.default, .squeeze, .fuse]
        case .waiting: [.default]
        case .using: [.default, .tap, .scroll, .type, .zoom, .snap, .record]
        }
    }
}

/// A look of a state, named after its motion. One its state doesn't have falls back to `default`.
public enum OrbVariant: String, CaseIterable, Sendable {
    case `default`, blink, gyro, twins, lighthouse, spiral, surge, squeeze, fuse, tap, scroll, type, zoom, snap, record
}

/// Which way Using · Scroll scrolls, as a page does, and which side Using clicks out on.
public enum OrbDirection: String, CaseIterable, Sendable {
    case right, upRight = "up-right", up, upLeft = "up-left", left, downLeft = "down-left", down, downRight = "down-right"

    /// Its angle on screen: right 0, up 90.
    var degrees: Double { Double(Self.allCases.firstIndex(of: self)!) * 45 }
}

/// What the drawing keys on: the state alone for its default look, or state-variant.
enum Look: String {
    case idle, idleBlink = "idle-blink", working, workingGyro = "working-gyro", reasoning, reasoningTwins = "reasoning-twins"
    case searching, searchingLighthouse = "searching-lighthouse", background, backgroundSpiral = "background-spiral"
    case retrying, retryingSurge = "retrying-surge", compacting, compactingSqueeze = "compacting-squeeze", compactingFuse = "compacting-fuse"
    case waiting, using, usingTap = "using-tap", usingScroll = "using-scroll", usingType = "using-type", usingZoom = "using-zoom"
    case usingSnap = "using-snap", usingRecord = "using-record"

    init(_ state: OrbState, _ variant: OrbVariant) {
        let own = variant != .default && state.variants.contains(variant)
        self = Look(rawValue: own ? "\(state.rawValue)-\(variant.rawValue)" : state.rawValue)!
    }

    /// Time for one full turn, in ms. Retrying's two set their own pace in `yawOf`.
    var period: Double {
        switch self {
        case .working, .workingGyro: 3000
        case .idle, .reasoning, .reasoningTwins: 6500
        case .compacting, .compactingSqueeze, .compactingFuse: 10000
        default: 13000
        }
    }
}

typealias V3 = SIMD3<Double>

private let TAU = Double.pi * 2
private let GOLDEN = Double.pi * (3 - 5.0.squareRoot())
private func ease(_ x: Double) -> Double { (1 - cos(.pi * x)) / 2 }
private func sq(_ x: Double) -> Double { x * x }
private func hash(_ n: Double) -> Double {
    let s = sin(n * 127.1) * 43758.5453
    return s - floor(s)
}
private func dist2(_ a: V3, _ b: V3) -> Double { sq(a.x - b.x) + sq(a.y - b.y) + sq(a.z - b.z) }
private func len(_ v: V3) -> Double { (v * v).sum().squareRoot() }

/// The k points nearest pts[i], nearest first: one pass keeping a short sorted list.
private func nearest(_ pts: [V3], _ i: Int, _ k: Int) -> [Int] {
    var idx: [Int] = [], d: [Double] = []
    for j in pts.indices where j != i {
        let e = dist2(pts[i], pts[j])
        if idx.count == k {
            if e >= d[k - 1] { continue }
            idx.removeLast()
            d.removeLast()
        }
        var at = idx.count
        while at > 0 && d[at - 1] > e { at -= 1 }
        idx.insert(j, at: at)
        d.insert(e, at: at)
    }
    return idx
}

/// One clock (ms) per look and speed, so every orb of it stays in phase. A frame's gap is capped at
/// 100ms, so an app coming back from the background, or a look nobody had on screen, carries on instead of jumping.
var clocks: [String: (t: Double, last: Double)] = [:]
func tick(_ look: String, _ now: Double, _ speed: Double) -> Double {
    var c = clocks[look] ?? (0, now)
    if now > c.last {
        c.t += min(now - c.last, 100) * speed
        c.last = now
    }
    clocks[look] = c
    return c.t
}

/// A spring settling from 0 to 1: shoots ~22% past, dips ~5% under, and lands on 1 exactly at x=1.
private func spring(_ x: Double) -> Double { 1 - exp(-4.5 * x) * cos(3 * .pi * x) - x * exp(-4.5) }

/// Retrying's spin at `t` for speed `w` (rad/ms), every 3.2s: turns 2s, brakes over 0.2s, springs
/// back 60% of what it turned over 0.8s, then speeds up again over 0.2s.
private func rewind(_ t: Double, _ w: Double) -> Double {
    let P = 3200.0, k = floor(t / P), u = t - k * P
    let back = 0.6 * 2100 * w
    let fwd = (2000 + 100 + 100) * w
    let a: Double
    if u < 2000 { a = u * w }
    else if u < 2200 {
        let x = (u - 2000) / 200
        a = (2000 + 200 * (x - (x * x) / 2)) * w
    } else if u < 3000 { a = 2100 * w - back * spring((u - 2200) / 800) }
    else {
        let x = (u - 3000) / 200
        a = 2100 * w - back + 100 * x * x * w
    }
    return k * (fwd - back) + a
}

private func yawOf(_ look: Look, _ t: Double) -> Double {
    switch look {
    case .retrying: return rewind(2 * t, TAU / 9000)
    case .retryingSurge:
        let turns = t / 3250, u = turns - floor(turns)
        return (floor(turns) + (1 - pow(1 - u, 3))) * TAU
    case .usingScroll: return 0.4
    case .usingSnap: return ((floor(t / BEAT) * SPIN + min(fmod(t, BEAT), SPIN)) / look.period) * TAU
    default: return (t / look.period) * TAU
    }
}

/// Working's ring axis in view space: tipped 30° toward you, then rolled 10° so its right end rides higher.
private let RING_AXIS: V3 = {
    let tip = (30 * Double.pi) / 180, roll = (10 * Double.pi) / 180
    return V3(-sin(roll) * cos(tip), cos(roll) * cos(tip), sin(tip))
}()
private let TWIST = 1.4
private let LEAN = (30 * Double.pi) / 180, TRAIL = Double.pi / 2

// Searching: a lens hops between spots on the front of the sphere, gliding for the first MOVE of each hop.
private let LENS_MS = 1800.0, MOVE = 0.4, LENS = 0.6
private func spot(_ k: Double) -> V3 {
    let phi = k * 2.45 + hash(k) * 1.5, theta = ((15 + 30 * hash(k + 0.5)) * Double.pi) / 180
    return V3(sin(theta) * cos(phi), sin(theta) * sin(phi), cos(theta))
}
private func slide(_ a: V3, _ b: V3, _ e: Double) -> V3 {
    let v = a + (b - a) * e
    return v / len(v)
}
private func lensAt(_ t: Double) -> V3 {
    let k = floor(t / LENS_MS), u = t / LENS_MS - k
    return slide(spot(k), spot(k + 1), u < MOVE ? (1 - cos((u / MOVE) * .pi)) / 2 : 1)
}

// Using: a cursor in view space that glides between spots on the front and clicks on them.
private let PTR = 0.45, PRESS = 0.5, RIPPLE_MS = 600.0
private func mark(_ k: Double) -> V3 { spot(k + 57) }
private func bump(_ ang: Double, _ w: Double) -> Double { ang < w ? sq(1 - sq(ang / w)) : 0 }
private struct Tap { var at: V3, click: V3, since: Double }
private let TAP = 1400.0
private func tapAt(_ t: Double) -> Tap {
    let k = floor(t / TAP), u = t / TAP - k
    return Tap(at: slide(mark(k), mark(k + 1), u < 0.35 ? ease(u / 0.35) : 1), click: mark(u < 0.5 ? k : k + 1), since: (u < 0.5 ? u + 0.5 : u - 0.5) * TAP)
}
private func pressOf(_ s: Double) -> Double { s < 60 ? s / 60 : sq(max(0, 1 - (s - 60) / 240)) }
/// Using's cursor: the classic arrow's outline, x right and y down from its tip, one sphere radius tall.
private let ARROW: [(Double, Double)] = [(0, 0), (0, 16), (4, 12), (7, 18), (9, 17), (6, 11), (11, 11)].map { ($0.0 / 18, $0.1 / 18) }
private func inside(_ poly: [(Double, Double)], _ x: Double, _ y: Double) -> Bool {
    var hit = false, j = poly.count - 1
    for i in poly.indices {
        let (xi, yi) = poly[i], (xj, yj) = poly[j]
        if (yi > y) != (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi { hit.toggle() }
        j = i
    }
    return hit
}
private let HOME = (-0.3, 0.5)
private func onFace(_ x: Double, _ y: Double) -> V3 { V3(x, y, max(0, 1 - x * x - y * y).squareRoot()) }
private func tipOf(_ p: V3) -> V3 { onFace(HOME.0 + 0.35 * p.x, HOME.1 + 0.35 * p.y) }
private let AIM = 1800.0
private func aimAt(_ t: Double, _ phi: Double) -> Tap {
    let u = fmod(t, AIM) / AIM
    let e = u < 0.3 ? ease(u / 0.3) : u < 0.6 ? 1 : u < 0.85 ? 1 - ease((u - 0.6) / 0.25) : 0
    func out(_ s: Double) -> V3 { onFace(HOME.0 + 0.3 * s * cos(phi), HOME.1 + 0.3 * s * sin(phi)) }
    return Tap(at: out(e), click: out(1), since: (u < 0.45 ? u + 0.55 : u - 0.45) * AIM)
}
private let ZOOM = 2600.0
private let BEAT = 2600.0, SPIN = 2100.0
private func snapAt(_ t: Double) -> Double {
    let u = fmod(t, BEAT) - SPIN
    return u < 0 ? 0 : exp(-u / 220)
}
private func blinkAt(_ t: Double) -> Double {
    let u = fmod(t, BEAT)
    return u < 120 ? 1.2 * (1 - ease(u / 120)) : u < 180 ? 0 : u < 430 ? 1.2 * ease((u - 180) / 250) : 1.2
}
private let REC = 1200.0
private func recAt(_ t: Double) -> Double { abs(1 - 2 * (fmod(t, REC) / REC)) }
private func zoomAt(_ t: Double) -> Double {
    let u = fmod(t, ZOOM) / ZOOM
    return u < 0.25 ? ease(u / 0.25) : u < 0.5 ? 1 : u < 0.75 ? 1 - ease((u - 0.5) / 0.25) : 0
}
private let FLICK = 1500.0, FLING = 1.1
private func scrollAt(_ t: Double) -> (by: Double, pace: Double) {
    let k = floor(t / FLICK), x = min(1, (t / FLICK - k) / 0.75)
    return ((k + 1 - pow(1 - x, 3)) * FLING, sq(1 - x))
}
private let PAN = [90.0, 270, 45, 180, 0, 225].map { ($0 * Double.pi) / 180 }
private let IDENTITY: [Double] = [1, 0, 0, 0, 1, 0, 0, 0, 1]
/// The 3×3 turn (row-major) by `th` rad that carries the front of the sphere `phi` rad round from right on screen.
private func panTurn(_ phi: Double, _ th: Double) -> [Double] {
    let ax = -sin(phi), ay = cos(phi), s = sin(th), c = cos(th), v = 1 - c
    return [c + ax * ax * v, ax * ay * v, ay * s, ax * ay * v, c + ay * ay * v, -ax * s, -ay * s, ax * s, c]
}
private func times(_ m: [Double], _ n: [Double]) -> [Double] {
    (0..<9).map { i in
        let r = i - i % 3, c = i % 3
        return m[r] * n[c] + m[r + 1] * n[c + 3] + m[r + 2] * n[c + 6]
    }
}

// Type: a short paragraph typed onto the face, "x" a letter and " " a space, in cells CELL wide from LEFT,
// lines LEAD apart down from TOP, in sphere radii on screen.
private let TEXT = ["xxxx xxx xx", "xxxxx xx xxxx", "xxx xxxxx"].map { Array($0) }
private let CELL = 0.09, LEAD = 0.3, TOP = 0.33, LEFT = -0.5
private let KEYS: [(row: Int, col: Int, at: Double)] = {
    var at = 0.0, keys: [(row: Int, col: Int, at: Double)] = []
    for (row, line) in TEXT.enumerated() {
        for (col, ch) in line.enumerated() {
            keys.append((row, col, at))
            at += ch == " " ? 200 : col == line.count - 1 ? 350 : 70 + 60 * hash(Double(row * 31 + col))
        }
    }
    return keys
}()
/// Which key types each cell, by row then column.
private let KEY_OF: [[Int]] = TEXT.indices.map { row in KEYS.indices.filter { KEYS[$0].row == row } }
private let TYPED = KEYS[KEYS.count - 1].at, PARAGRAPH = TYPED + 1300
private func typeAt(_ t: Double) -> (n: Int, since: Double, blink: Double, caret: (Double, Double), fade: Double) {
    let c = fmod(t, PARAGRAPH)
    var n = 0
    while n < KEYS.count && KEYS[n].at <= c { n += 1 }
    let since = n > 0 ? c - KEYS[n - 1].at : .infinity
    let next = n < KEYS.count ? (KEYS[n].row, KEYS[n].col) : (TEXT.count - 1, TEXT[TEXT.count - 1].count)
    let blink: Double = since < 300 ? 1 : Int(floor(c / 450)) % 2 == 0 ? 1 : 0
    let fade = c < TYPED + 900 ? 1 : max(0, 1 - (c - TYPED - 900) / 300)
    return (n, since, blink, (LEFT + Double(next.1) * CELL, TOP - Double(next.0) * LEAD), fade)
}

/// Reasoning's walk: a hop every HOP ms to one of the REACH nearest dots, the last TAIL lit and fading.
private let HOP = 220.0, TAIL = 5, REACH = 24, WALK = 16

/// Background · Spiral's eight arms, wound pole to pole.
private func arms(_ count: Int) -> [V3] {
    let g = ((4 * Double.pi) / Double(count)).squareRoot(), n = 8, along = 0.6 * g
    var out: [V3] = []
    for m in 0..<n {
        let room = m != 0 ? m & -m : n
        let lim = min((85 * Double.pi) / 180, acos(min(1, (g * Double(n)) / (TAU * Double(room)))))
        var lat = -lim + fmod(Double(m) * 0.618, 1) * along
        while lat <= lim {
            let lon = (Double(m) / Double(n)) * TAU - lat
            out.append(V3(cos(lat) * cos(lon), sin(lat), cos(lat) * sin(lon)))
            lat += along / (1 + sq(cos(lat))).squareRoot()
        }
    }
    return out
}

/// Where the dots sit: on a unit sphere, a Fibonacci spiral, or for Background · Spiral, eight arms.
private func distribute(_ look: Look, _ count: Int) -> [V3] {
    if look == .backgroundSpiral { return arms(count) }
    return (0..<count).map { i in
        let y = 1 - (2 * (Double(i) + 0.5)) / Double(count), r = (1 - y * y).squareRoot(), th = Double(i) * GOLDEN
        return V3(r * cos(th), y, r * sin(th))
    }
}

/// Everything that sets an orb's dots, so a view rebuilds its engine only when one of these changes.
struct OrbConfig: Hashable {
    var look: Look, size: Double, density: Double, dotSize: Double, tilt: Double, direction: OrbDirection?
}

/// One orb's dots and the little state its walk and pan carry from frame to frame.
final class OrbEngine {
    let config: OrbConfig
    private let pts: [V3], rs: Double
    private let reasoning: Bool, compacting: Bool
    private let near: [[Int]]
    private var walks: [[Int]], hops = 0
    private var panned = (k: 0, m: IDENTITY)

    init(_ config: OrbConfig) {
        self.config = config
        let look = config.look, size = config.size
        // Background has a quarter of the dots; Using draws its arrow, and Type its text, in about 1000 finer ones.
        let dens = look == .background ? 1 : look == .using || look == .usingType ? max(4, 1000 / size) : 4
        let count = max(8, Int((size * dens * config.density).rounded()))
        rs = pow(size / 64, 0.6) * (0.72 * (4 / dens).squareRoot()) * config.dotSize
        let pts = distribute(look, count)
        self.pts = pts
        reasoning = (look == .reasoning || look == .reasoningTwins) && pts.count > 1
        compacting = look == .compacting || look == .compactingFuse
        near = reasoning ? pts.indices.map { nearest(pts, $0, REACH) } : []
        walks = Array(repeating: [], count: look == .reasoningTwins ? 2 : 1)
    }

    /// Draws the frame at `t` ms, handing `dot` each dot's centre in points, radius and opacity.
    func draw(_ t: Double, _ dot: (_ x: Double, _ y: Double, _ r: Double, _ a: Double) -> Void) {
        let look = config.look, size = config.size
        let c = size / 2, R = c * 0.8
        let period = look.period, yaw = yawOf(look, t)
        let scroll = look == .usingScroll ? scrollAt(t) : nil
        let way = config.direction?.degrees
        var pan: [Double]? = nil
        if let scroll, let way {
            // Given a direction, Scroll keeps to it, and the face moves against it, as a page's content does.
            pan = panTurn((way * Double.pi) / 180 + .pi, scroll.by)
        } else if let scroll {
            // Without one it pans: the flicks so far, stacked up once each, then the one under way on top.
            let k = Int(floor(t / FLICK))
            if k < panned.k { panned = (0, IDENTITY) }
            while panned.k < k {
                panned.m = times(panTurn(PAN[panned.k % PAN.count], FLING), panned.m)
                panned.k += 1
            }
            pan = times(panTurn(PAN[k % PAN.count], scroll.by - Double(k) * FLING), panned.m)
        }
        let gyro: Double? = look == .workingGyro ? (t / 5000) * TAU : nil
        let pitch = ((config.tilt + (gyro.map { 10 * cos($0) } ?? 0)) * Double.pi) / 180
        let roll = gyro.map { ((12 * sin($0)) * Double.pi) / 180 } ?? 0, sr = sin(roll), cr = cos(roll)
        let sy = sin(yaw), cy = cos(yaw), st = sin(pitch), ct = cos(pitch)
        func facing(_ k: Int) -> Double { pts[k].y * st + (-pts[k].x * sy + pts[k].z * cy) * ct }

        var lit: [Int: Double] = [:]
        if reasoning {
            let s = t / HOP, n = Int(floor(s)), f = s - floor(s)
            if walks[0].isEmpty {
                // The first walker starts at the dot facing you most; a second, at a front dot well away from it.
                func argmax(_ score: (Int) -> Double) -> Int { pts.indices.reduce(0) { score($1) > score($0) ? $1 : $0 } }
                let first = argmax(facing)
                for w in walks.indices { walks[w].append(w != 0 ? argmax { facing($0) + dist2(pts[$0], pts[first]) } : first) }
            }
            hops = max(hops, n - WALK)
            while hops < n {
                for w in walks.indices {
                    // Hop to the neighbour that faces you most, with a little chance mixed in so it wanders.
                    let recent = walks[w].suffix(8), from = walks[w][walks[w].count - 1]
                    var best = -1, score = -Double.infinity
                    let other = look == .reasoningTwins ? walks[1 - w].last : nil
                    for (j, k) in near[from].enumerated() {
                        let apart = other.map { 1.2 * min(dist2(pts[k], pts[$0]).squareRoot(), 0.8) } ?? 0
                        let sc = facing(k) + 0.35 * hash(Double(hops * 31 + j + w * 977)) + apart
                        if !recent.contains(k) && sc > score {
                            score = sc
                            best = k
                        }
                    }
                    walks[w].append(best < 0 ? near[from][0] : best)
                    if walks[w].count > WALK { walks[w].removeFirst() }
                }
                hops += 1
            }
            for walk in walks {
                for j in stride(from: TAIL - 1, through: 0, by: -1) where walk.count - 1 - j >= 0 {
                    let k = walk[walk.count - 1 - j]
                    lit[k] = max(lit[k] ?? 0, j == 0 ? ease(min(1, f * 2)) : 1 - (Double(j - 1) + f) / Double(TAIL))
                }
            }
        }
        // Waiting: a comet's head laps every 2s on screen, spiralling from 70° north to 70° south every 6s.
        let head = (t / 2000) * TAU + yaw, ahead = TAU / 2000 + TAU / period
        func headLat(_ tt: Double) -> Double { ((70 * Double.pi) / 180) * (1 - 2 * (fmod(tt, 6000) / 6000)) }
        let glow = min(1, 3 * sin(Double.pi * (fmod(t, 6000) / 6000)))
        let lens = look == .searching ? lensAt(t) : nil
        let tw = look == .workingGyro ? 0.5 * sin((t / 2600) * TAU) : look == .compactingSqueeze ? sin((t / 2600) * TAU) : 0
        var sweep: (at: Double, hold: Double)? = nil
        if compacting {
            let u = fmod(t, 2800) / 2800, s = (u - 0.7) / 0.3
            let release = look == .compactingFuse ? pow(1 - s, 3) : s < 0.45 ? 1 - 1.25 * ease(s / 0.45) : s < 0.7 ? -0.25 * sq(1 - (s - 0.45) / 0.25) : 0
            sweep = (-1.15 + 2.3 * min(1, u / 0.7), u < 0.7 ? 1 : release)
        }

        var tap = look == .usingTap ? tapAt(t) : nil
        let outline = look == .using
        if outline {
            if let way { tap = aimAt(t, (way * Double.pi) / 180) }
            else {
                let p = tapAt(t)
                tap = Tap(at: tipOf(p.at), click: tipOf(p.click), since: p.since)
            }
        }
        let shrink = outline ? 1 - 0.15 * pressOf(tap!.since) : 1
        let type = look == .usingType ? typeAt(t) : nil
        let zoom = look == .usingZoom ? zoomAt(t) : nil
        let flash = look == .usingSnap ? snapAt(t) : nil
        let lids = look == .idleBlink ? blinkAt(t) : nil
        let rec = look == .usingRecord ? recAt(t) : nil

        for (i, p) in pts.enumerated() {
            let x = p.x, y = p.y, z = p.z
            // Twist turns each dot by an angle that grows with its height: top and bottom opposite ways.
            let turn = yaw + TWIST * tw * y
            let (ly, lc) = tw != 0 ? (sin(turn), cos(turn)) : (sy, cy)
            let z1 = -x * ly + z * lc
            var vx = x * lc + z * ly, vy = y * ct - z1 * st
            var vz = y * st + z1 * ct
            if let m = pan { (vx, vy, vz) = (m[0] * vx + m[1] * vy + m[2] * vz, m[3] * vx + m[4] * vy + m[5] * vz, m[6] * vx + m[7] * vy + m[8] * vz) }
            let d = (vz + 1) / 2
            var r = (0.5 + 1.4 * d) * rs
            var a = max(0, (d - 0.3) / 0.7)
            if let lens {
                let ang = acos(min(1, (vx * lens.x + vy * lens.y + vz * lens.z) / len(V3(vx, vy, vz))))
                let w = ang < LENS ? sq(1 - sq(ang / LENS)) : 0
                a *= 1 - 0.55 * (1 - w)
                if size <= 24 { r *= 1 + 0.5 * w }
                if w != 0 {
                    vx *= 1 + 0.12 * w
                    vy *= 1 + 0.12 * w
                    vx += (vx - lens.x) * 0.35 * w
                    vy += (vy - lens.y) * 0.35 * w
                    r *= 1 + 0.9 * w
                    a += (1 - a) * w
                }
            }
            if let sweep {
                let q = vx, w = min(1, max(0, (sweep.at - q) / 0.2)) * sweep.hold
                let k = look == .compacting ? 1.5 : 1
                vx *= 1 - 0.2 * k * w
                vy *= 1 - 0.2 * k * w
                r *= 1 - 0.3 * k * w
                if look == .compactingFuse {
                    a *= 1 - 0.5 * w
                    let g = exp(-sq((q - sweep.at) / 0.08)) * max(0, sweep.hold) * min(1, d / 0.5)
                    r *= 1 + 0.8 * g
                    a += (1 - a) * g
                }
            }
            if look == .working {
                // Every 1.7s a ring of light runs down the sphere over 1.2s; what it's passed pulls in, then lets go.
                let u = fmod(t, 1700), at = 1.3 - 2.6 * ease(min(1, u / 1200))
                let q = vx * RING_AXIS.x + vy * RING_AXIS.y + vz * RING_AXIS.z
                let g = u < 1200 ? exp(-sq((q - at) / 0.2)) : 0
                r *= 1 + 0.6 * g
                a += (1 - a) * g
                let w = min(1, max(0, (q - at) / 0.2)) * (u < 1200 ? 1 : 1 - min(1, 1.6 * ((u - 1200) / 800)))
                vx *= 1 - 0.08 * w
                vy *= 1 - 0.08 * w
                r *= 1 - 0.15 * w
            }
            if look == .searchingLighthouse {
                // A beam leaning 30° right circles the axis every 2.5s, its trail dying out 90° behind it.
                a *= 0.5
                let lr = sin(LEAN), lnc = cos(LEAN)
                let across = vx * lnc - vy * lr, toward = -st * (vx * lr + vy * lnc) + ct * vz
                let off = atan2(across, toward) - (fmod(t / 2500, 1) * TAU - .pi)
                let dphi = fmod(fmod(off + .pi, TAU) + TAU, TAU) - .pi
                let beam = dphi < 0 ? max(0, 1 + dphi / TRAIL) : exp(-sq(dphi / 0.45))
                let g = beam * (0.25 + 0.75 * min(1, max(0, (d - 0.4) / 0.3)))
                r *= 1 + 0.6 * g
                a += (1 - a) * g
            }
            if reasoning {
                let spark = lit[i] ?? 0
                a *= 0.5
                if spark != 0 {
                    r *= 1 + 0.8 * spark
                    a += (1 - a) * spark
                }
            }
            if look == .waiting {
                // A sharp head and a long fading tail, its width measured along the surface.
                let n = len(p)
                let lat = asin(y / (n != 0 ? n : 1)), lon = atan2(z, x)
                let off = atan2(sin(lon - head), cos(lon - head)), along = off * cos(lat)
                let g = exp(-sq((lat - headLat(t + off / ahead)) / 0.28)) * exp(-sq(along / (off * ahead > 0 ? 0.12 : 1)))
                let w = glow * pow(g, 0.6)
                a = a * 0.5 + (1 - a * 0.5) * w
                r *= 1 + 1.1 * w
            }
            if let tap {
                let n0 = len(V3(vx, vy, vz)), n = n0 != 0 ? n0 : 1
                func off(_ p: V3) -> Double { acos(min(1, max(-1, (vx * p.x + vy * p.y + vz * p.z) / n))) }
                a *= outline ? 0.25 : 0.5
                // A click dents what's under it for 300ms, and a ring runs out from it, fading.
                let s = tap.since, ptr = outline ? 0 : bump(off(tap.at), PTR), ak = off(tap.click)
                let press = pressOf(s), pw = press * bump(ak, PRESS)
                let run = min(1, s / RIPPLE_MS)
                let ring = exp(-sq((ak - (0.15 + 1.3 * (1 - sq(1 - run)))) / 0.18)) * sq(1 - run)
                vx *= 1 - 0.14 * pw
                vy *= 1 - 0.14 * pw
                r *= (1 - 0.35 * pw) * (1 + 0.7 * max(ring, ptr * (1 - press)))
                a += (1 - a) * max(ptr, ring)
                if outline && inside(ARROW, (vx - tap.at.x) / shrink, (tap.at.y - vy) / shrink) {
                    let lit = min(1, max(0, (d - 0.5) / 0.2))
                    r *= 1 + 0.15 * lit
                    a += (1 - a) * lit
                }
            }
            if let type {
                // The paragraph lights cell by cell as it's typed, the newest letter brightest; the caret is an upright bar.
                a *= 0.25
                let row = Int(floor((TOP - vy) / LEAD + 0.5)), col = Int(floor((vx - LEFT) / CELL))
                var g = 0.0
                if KEY_OF.indices.contains(row) && KEY_OF[row].indices.contains(col) {
                    let key = KEY_OF[row][col]
                    if key < type.n && TEXT[row][col] == "x" && abs(TOP - Double(row) * LEAD - vy) < 0.085 {
                        g = 0.75 + (key == type.n - 1 ? 0.25 * exp(-type.since / 120) : 0)
                    }
                }
                if abs(vy - type.caret.1) < 0.1 { g = max(g, type.blink * exp(-sq((vx - type.caret.0) / 0.04))) }
                a += (1 - a) * g * type.fade * min(1, max(0, (d - 0.5) / 0.2))
            }
            if let zoom, zoom != 0 {
                let w = zoom * max(0, vz)
                vx *= 1 + 0.45 * w
                vy *= 1 + 0.45 * w
                r *= 1 + 0.8 * w
                a *= min(1, max(0, (1.05 - (vx * vx + vy * vy).squareRoot()) / 0.1))
            }
            if let scroll { a *= 0.55 + 0.45 * scroll.pace }
            if let flash {
                a *= 0.55
                r *= 1 + 0.25 * flash
                a += (1 - a) * flash
            }
            if let lids {
                let edge = exp(-sq((abs(vy) - lids) / 0.06)) * (lids < 1.2 ? 1 : 0)
                a *= min(1, max(0, (lids - abs(vy)) / 0.08))
                r *= 1 + 0.4 * edge
                a += (1 - a) * edge * min(1, max(0, (d - 0.4) / 0.3))
            }
            if let rec {
                vx *= 0.92 + 0.08 * rec
                vy *= 0.92 + 0.08 * rec
                a *= 0.3 + 0.7 * rec
            }
            if roll != 0 { (vx, vy) = (vx * cr - vy * sr, vx * sr + vy * cr) }
            dot(c + vx * R, c - vy * R, r, a)
        }
    }
}
