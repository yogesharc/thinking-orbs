package com.yogesharc.thinkingorbs

import kotlin.math.PI
import kotlin.math.abs
import kotlin.math.acos
import kotlin.math.asin
import kotlin.math.atan2
import kotlin.math.cos
import kotlin.math.exp
import kotlin.math.floor
import kotlin.math.max
import kotlin.math.min
import kotlin.math.pow
import kotlin.math.roundToInt
import kotlin.math.sin
import kotlin.math.sqrt

// A line-for-line port of packages/swift/Sources/ThinkingOrbs/OrbCore.swift, itself a port of
// apps/web/registry/orb/orb-core.ts, so all three draw the same frame at the same time.
// Change the drawing in orb-core.ts first, then in both ports, keeping the same order of operations.

/** One state per thing an agent does. [variants] lists the looks each comes in, `Default` first. */
public enum class OrbState(public val variants: List<OrbVariant>) {
    Idle(listOf(OrbVariant.Default, OrbVariant.Blink)),
    Working(listOf(OrbVariant.Default, OrbVariant.Gyro)),
    Reasoning(listOf(OrbVariant.Default, OrbVariant.Twins)),
    Searching(listOf(OrbVariant.Default, OrbVariant.Lighthouse)),
    Background(listOf(OrbVariant.Default, OrbVariant.Spiral)),
    Retrying(listOf(OrbVariant.Default, OrbVariant.Surge)),
    Compacting(listOf(OrbVariant.Default, OrbVariant.Squeeze, OrbVariant.Fuse)),
    Waiting(listOf(OrbVariant.Default)),
    Using(listOf(OrbVariant.Default, OrbVariant.Tap, OrbVariant.Scroll, OrbVariant.Type, OrbVariant.Zoom, OrbVariant.Snap, OrbVariant.Record)),
}

/** A look of a state, named after its motion. One its state doesn't have falls back to `Default`. */
public enum class OrbVariant { Default, Blink, Gyro, Twins, Lighthouse, Spiral, Surge, Squeeze, Fuse, Tap, Scroll, Type, Zoom, Snap, Record }

/** Which way Using · Scroll scrolls, as a page does, and which side Using clicks out on. */
public enum class OrbDirection { Right, UpRight, Up, UpLeft, Left, DownLeft, Down, DownRight;
    /** Its angle on screen: right 0, up 90. */
    internal val degrees: Double get() = ordinal * 45.0
}

/** What the drawing keys on: the state alone for its default look, or state-variant. */
internal enum class Look(val key: String) {
    Idle("idle"), IdleBlink("idle-blink"), Working("working"), WorkingGyro("working-gyro"), Reasoning("reasoning"),
    ReasoningTwins("reasoning-twins"), Searching("searching"), SearchingLighthouse("searching-lighthouse"),
    Background("background"), BackgroundSpiral("background-spiral"), Retrying("retrying"), RetryingSurge("retrying-surge"),
    Compacting("compacting"), CompactingSqueeze("compacting-squeeze"), CompactingFuse("compacting-fuse"), Waiting("waiting"),
    Using("using"), UsingTap("using-tap"), UsingScroll("using-scroll"), UsingType("using-type"), UsingZoom("using-zoom"),
    UsingSnap("using-snap"), UsingRecord("using-record");

    /** Time for one full turn, in ms. Retrying's two set their own pace in `yawOf`. */
    internal val period: Double
        get() = when (this) {
            Working, WorkingGyro -> 3000.0
            Idle, Reasoning, ReasoningTwins -> 6500.0
            Compacting, CompactingSqueeze, CompactingFuse -> 10000.0
            else -> 13000.0
        }

    companion object {
        internal fun of(state: OrbState, variant: OrbVariant): Look {
            val own = variant != OrbVariant.Default && variant in state.variants
            val key = state.name.lowercase() + if (own) "-" + variant.name.lowercase() else ""
            return entries.first { it.key == key }
        }
    }
}

internal data class V3(val x: Double, val y: Double, val z: Double) {
    operator fun plus(o: V3) = V3(x + o.x, y + o.y, z + o.z)
    operator fun minus(o: V3) = V3(x - o.x, y - o.y, z - o.z)
    operator fun times(k: Double) = V3(x * k, y * k, z * k)
    operator fun div(k: Double) = V3(x / k, y / k, z / k)
}

private const val TAU = PI * 2
private val GOLDEN = PI * (3 - sqrt(5.0))
private fun ease(x: Double) = (1 - cos(PI * x)) / 2
private fun sq(x: Double) = x * x
private fun hash(n: Double): Double {
    val s = sin(n * 127.1) * 43758.5453
    return s - floor(s)
}
private fun dist2(a: V3, b: V3) = sq(a.x - b.x) + sq(a.y - b.y) + sq(a.z - b.z)
private fun len(v: V3) = sqrt(v.x * v.x + v.y * v.y + v.z * v.z)
/** Swift's `fmod`: the remainder keeps the dividend's sign, as Kotlin's `%` on doubles does. */
private fun fmod(a: Double, b: Double) = a % b

/** The k points nearest pts[i], nearest first: one pass keeping a short sorted list. */
private fun nearest(pts: List<V3>, i: Int, k: Int): List<Int> {
    val idx = ArrayList<Int>()
    val d = ArrayList<Double>()
    for (j in pts.indices) {
        if (j == i) continue
        val e = dist2(pts[i], pts[j])
        if (idx.size == k) {
            if (e >= d[k - 1]) continue
            idx.removeAt(idx.lastIndex)
            d.removeAt(d.lastIndex)
        }
        var at = idx.size
        while (at > 0 && d[at - 1] > e) at--
        idx.add(at, j)
        d.add(at, e)
    }
    return idx
}

private class Clock(var t: Double, var last: Double)

/**
 * One clock (ms) per look and speed, so every orb of it stays in phase. A frame's gap is capped at
 * 100ms, so an app coming back from the background, or a look nobody had on screen, carries on instead of jumping.
 */
private val clocks = HashMap<String, Clock>()

internal fun tick(look: String, now: Double, speed: Double): Double {
    val c = clocks.getOrPut(look) { Clock(0.0, now) }
    if (now > c.last) {
        c.t += min(now - c.last, 100.0) * speed
        c.last = now
    }
    return c.t
}

/** A spring settling from 0 to 1: shoots ~22% past, dips ~5% under, and lands on 1 exactly at x=1. */
private fun spring(x: Double) = 1 - exp(-4.5 * x) * cos(3 * PI * x) - x * exp(-4.5)

/** Retrying's spin at `t` for speed `w` (rad/ms), every 3.2s: turns 2s, brakes, springs back 60%, speeds up again. */
private fun rewind(t: Double, w: Double): Double {
    val p = 3200.0
    val k = floor(t / p)
    val u = t - k * p
    val back = 0.6 * 2100 * w
    val fwd = (2000 + 100 + 100) * w
    val a = when {
        u < 2000 -> u * w
        u < 2200 -> { val x = (u - 2000) / 200; (2000 + 200 * (x - (x * x) / 2)) * w }
        u < 3000 -> 2100 * w - back * spring((u - 2200) / 800)
        else -> { val x = (u - 3000) / 200; 2100 * w - back + 100 * x * x * w }
    }
    return k * (fwd - back) + a
}

private const val BEAT = 2600.0
private const val SPIN = 2100.0

private fun yawOf(look: Look, t: Double): Double = when (look) {
    Look.Retrying -> rewind(2 * t, TAU / 9000)
    Look.RetryingSurge -> {
        val turns = t / 3250
        val u = turns - floor(turns)
        (floor(turns) + (1 - (1 - u).pow(3))) * TAU
    }
    Look.UsingScroll -> 0.4
    Look.UsingSnap -> ((floor(t / BEAT) * SPIN + min(fmod(t, BEAT), SPIN)) / look.period) * TAU
    else -> (t / look.period) * TAU
}

/** Working's ring axis in view space: tipped 30° toward you, then rolled 10° so its right end rides higher. */
private val RING_AXIS: V3 = run {
    val tip = (30 * PI) / 180
    val roll = (10 * PI) / 180
    V3(-sin(roll) * cos(tip), cos(roll) * cos(tip), sin(tip))
}
private const val TWIST = 1.4
private const val LEAN = (30 * PI) / 180
private const val TRAIL = PI / 2

// Searching: a lens hops between spots on the front of the sphere, gliding for the first MOVE of each hop.
private const val LENS_MS = 1800.0
private const val MOVE = 0.4
private const val LENS = 0.6
private fun spot(k: Double): V3 {
    val phi = k * 2.45 + hash(k) * 1.5
    val theta = ((15 + 30 * hash(k + 0.5)) * PI) / 180
    return V3(sin(theta) * cos(phi), sin(theta) * sin(phi), cos(theta))
}
private fun slide(a: V3, b: V3, e: Double): V3 {
    val v = a + (b - a) * e
    return v / len(v)
}
private fun lensAt(t: Double): V3 {
    val k = floor(t / LENS_MS)
    val u = t / LENS_MS - k
    return slide(spot(k), spot(k + 1), if (u < MOVE) (1 - cos((u / MOVE) * PI)) / 2 else 1.0)
}

// Using: a cursor in view space that glides between spots on the front and clicks on them.
private const val PTR = 0.45
private const val PRESS = 0.5
private const val RIPPLE_MS = 600.0
private fun mark(k: Double) = spot(k + 57)
private fun bump(ang: Double, w: Double) = if (ang < w) sq(1 - sq(ang / w)) else 0.0
private class Tap(val at: V3, val click: V3, val since: Double)
private const val TAP = 1400.0
private fun tapAt(t: Double): Tap {
    val k = floor(t / TAP)
    val u = t / TAP - k
    return Tap(slide(mark(k), mark(k + 1), if (u < 0.35) ease(u / 0.35) else 1.0), mark(if (u < 0.5) k else k + 1),
        (if (u < 0.5) u + 0.5 else u - 0.5) * TAP)
}
private fun pressOf(s: Double) = if (s < 60) s / 60 else sq(max(0.0, 1 - (s - 60) / 240))
/** Using's cursor: the classic arrow's outline, x right and y down from its tip, one sphere radius tall. */
private val ARROW = listOf(0.0 to 0.0, 0.0 to 16.0, 4.0 to 12.0, 7.0 to 18.0, 9.0 to 17.0, 6.0 to 11.0, 11.0 to 11.0).map { (it.first / 18) to (it.second / 18) }
private fun inside(poly: List<Pair<Double, Double>>, x: Double, y: Double): Boolean {
    var hit = false
    var j = poly.size - 1
    for (i in poly.indices) {
        val (xi, yi) = poly[i]
        val (xj, yj) = poly[j]
        if ((yi > y) != (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) hit = !hit
        j = i
    }
    return hit
}
private val HOME = -0.3 to 0.5
private fun onFace(x: Double, y: Double) = V3(x, y, sqrt(max(0.0, 1 - x * x - y * y)))
private fun tipOf(p: V3) = onFace(HOME.first + 0.35 * p.x, HOME.second + 0.35 * p.y)
private const val AIM = 1800.0
private fun aimAt(t: Double, phi: Double): Tap {
    val u = fmod(t, AIM) / AIM
    val e = if (u < 0.3) ease(u / 0.3) else if (u < 0.6) 1.0 else if (u < 0.85) 1 - ease((u - 0.6) / 0.25) else 0.0
    fun out(s: Double) = onFace(HOME.first + 0.3 * s * cos(phi), HOME.second + 0.3 * s * sin(phi))
    return Tap(out(e), out(1.0), (if (u < 0.45) u + 0.55 else u - 0.45) * AIM)
}
private const val ZOOM = 2600.0
private fun snapAt(t: Double): Double {
    val u = fmod(t, BEAT) - SPIN
    return if (u < 0) 0.0 else exp(-u / 220)
}
private fun blinkAt(t: Double): Double {
    val u = fmod(t, BEAT)
    return if (u < 120) 1.2 * (1 - ease(u / 120)) else if (u < 180) 0.0 else if (u < 430) 1.2 * ease((u - 180) / 250) else 1.2
}
private const val REC = 1200.0
private fun recAt(t: Double) = abs(1 - 2 * (fmod(t, REC) / REC))
private fun zoomAt(t: Double): Double {
    val u = fmod(t, ZOOM) / ZOOM
    return if (u < 0.25) ease(u / 0.25) else if (u < 0.5) 1.0 else if (u < 0.75) 1 - ease((u - 0.5) / 0.25) else 0.0
}
private const val FLICK = 1500.0
private const val FLING = 1.1
private fun scrollAt(t: Double): Pair<Double, Double> {
    val k = floor(t / FLICK)
    val x = min(1.0, (t / FLICK - k) / 0.75)
    return ((k + 1 - (1 - x).pow(3)) * FLING) to sq(1 - x)
}
private val PAN = listOf(90.0, 270.0, 45.0, 180.0, 0.0, 225.0).map { (it * PI) / 180 }
private val IDENTITY = doubleArrayOf(1.0, 0.0, 0.0, 0.0, 1.0, 0.0, 0.0, 0.0, 1.0)
/** The 3×3 turn (row-major) by `th` rad that carries the front of the sphere `phi` rad round from right on screen. */
private fun panTurn(phi: Double, th: Double): DoubleArray {
    val ax = -sin(phi)
    val ay = cos(phi)
    val s = sin(th)
    val c = cos(th)
    val v = 1 - c
    return doubleArrayOf(c + ax * ax * v, ax * ay * v, ay * s, ax * ay * v, c + ay * ay * v, -ax * s, -ay * s, ax * s, c)
}
private fun times(m: DoubleArray, n: DoubleArray) = DoubleArray(9) { i ->
    val r = i - i % 3
    val c = i % 3
    m[r] * n[c] + m[r + 1] * n[c + 3] + m[r + 2] * n[c + 6]
}

// Type: a short paragraph typed onto the face, "x" a letter and " " a space, in cells CELL wide from LEFT,
// lines LEAD apart down from TOP, in sphere radii on screen.
private val TEXT = listOf("xxxx xxx xx", "xxxxx xx xxxx", "xxx xxxxx")
private const val CELL = 0.09
private const val LEAD = 0.3
private const val TOP = 0.33
private const val LEFT = -0.5
private class Key(val row: Int, val col: Int, val at: Double)
private val KEYS: List<Key> = run {
    var at = 0.0
    val keys = ArrayList<Key>()
    for ((row, line) in TEXT.withIndex()) {
        for ((col, ch) in line.withIndex()) {
            keys += Key(row, col, at)
            at += if (ch == ' ') 200.0 else if (col == line.length - 1) 350.0 else 70 + 60 * hash((row * 31 + col).toDouble())
        }
    }
    keys
}
/** Which key types each cell, by row then column. */
private val KEY_OF: List<List<Int>> = TEXT.indices.map { row -> KEYS.indices.filter { KEYS[it].row == row } }
private val TYPED = KEYS.last().at
private val PARAGRAPH = TYPED + 1300
private class Typed(val n: Int, val since: Double, val blink: Double, val caret: Pair<Double, Double>, val fade: Double)
private fun typeAt(t: Double): Typed {
    val c = fmod(t, PARAGRAPH)
    var n = 0
    while (n < KEYS.size && KEYS[n].at <= c) n++
    val since = if (n > 0) c - KEYS[n - 1].at else Double.POSITIVE_INFINITY
    val next = if (n < KEYS.size) KEYS[n].row to KEYS[n].col else (TEXT.size - 1) to TEXT.last().length
    val blink = if (since < 300) 1.0 else if (floor(c / 450).toInt() % 2 == 0) 1.0 else 0.0
    val fade = if (c < TYPED + 900) 1.0 else max(0.0, 1 - (c - TYPED - 900) / 300)
    return Typed(n, since, blink, (LEFT + next.second * CELL) to (TOP - next.first * LEAD), fade)
}

/** Reasoning's walk: a hop every HOP ms to one of the REACH nearest dots, the last TAIL lit and fading. */
private const val HOP = 220.0
private const val TAIL = 5
private const val REACH = 24
private const val WALK = 16

/** Background · Spiral's eight arms, wound pole to pole. */
private fun arms(count: Int): List<V3> {
    val g = sqrt((4 * PI) / count)
    val n = 8
    val along = 0.6 * g
    val out = ArrayList<V3>()
    for (m in 0 until n) {
        val room = if (m != 0) m and -m else n
        val lim = min((85 * PI) / 180, acos(min(1.0, (g * n) / (TAU * room))))
        var lat = -lim + fmod(m * 0.618, 1.0) * along
        while (lat <= lim) {
            val lon = (m.toDouble() / n) * TAU - lat
            out += V3(cos(lat) * cos(lon), sin(lat), cos(lat) * sin(lon))
            lat += along / sqrt(1 + sq(cos(lat)))
        }
    }
    return out
}

/** Where the dots sit: on a unit sphere, a Fibonacci spiral, or for Background · Spiral, eight arms. */
private fun distribute(look: Look, count: Int): List<V3> {
    if (look == Look.BackgroundSpiral) return arms(count)
    return (0 until count).map { i ->
        val y = 1 - (2 * (i + 0.5)) / count
        val r = sqrt(1 - y * y)
        val th = i * GOLDEN
        V3(r * cos(th), y, r * sin(th))
    }
}

/** Everything that sets an orb's dots, so a view rebuilds its engine only when one of these changes. */
internal data class OrbConfig(
    val look: Look, val size: Double, val density: Double = 1.0, val dotSize: Double = 1.0,
    val tilt: Double = 20.0, val direction: OrbDirection? = null,
)

/** One orb's dots and the little state its walk and pan carry from frame to frame. */
internal class OrbEngine(val config: OrbConfig) {
    private val pts: List<V3>
    private val rs: Double
    private val reasoning: Boolean
    private val compacting: Boolean
    private val near: List<List<Int>>
    private val walks: List<ArrayList<Int>>
    private var hops = 0
    private var pannedK = 0
    private var pannedM = IDENTITY

    init {
        val look = config.look
        val size = config.size
        // Background has a quarter of the dots; Using draws its arrow, and Type its text, in about 1000 finer ones.
        val dens = if (look == Look.Background) 1.0 else if (look == Look.Using || look == Look.UsingType) max(4.0, 1000 / size) else 4.0
        val count = max(8, (size * dens * config.density).roundToInt())
        rs = (size / 64).pow(0.6) * (0.72 * sqrt(4 / dens)) * config.dotSize
        pts = distribute(look, count)
        reasoning = (look == Look.Reasoning || look == Look.ReasoningTwins) && pts.size > 1
        compacting = look == Look.Compacting || look == Look.CompactingFuse
        near = if (reasoning) pts.indices.map { nearest(pts, it, REACH) } else emptyList()
        walks = List(if (look == Look.ReasoningTwins) 2 else 1) { ArrayList() }
    }

    /** Draws the frame at `t` ms, handing `dot` each dot's centre, radius and opacity, in the orb's own units. */
    internal fun draw(t: Double, dot: (x: Double, y: Double, r: Double, a: Double) -> Unit) {
        val look = config.look
        val size = config.size
        val c = size / 2
        val bigR = c * 0.8
        val period = look.period
        val yaw = yawOf(look, t)
        val scroll = if (look == Look.UsingScroll) scrollAt(t) else null
        val way = config.direction?.degrees
        var pan: DoubleArray? = null
        if (scroll != null && way != null) {
            // Given a direction, Scroll keeps to it, and the face moves against it, as a page's content does.
            pan = panTurn((way * PI) / 180 + PI, scroll.first)
        } else if (scroll != null) {
            // Without one it pans: the flicks so far, stacked up once each, then the one under way on top.
            val k = floor(t / FLICK).toInt()
            if (k < pannedK) { pannedK = 0; pannedM = IDENTITY }
            while (pannedK < k) {
                pannedM = times(panTurn(PAN[pannedK % PAN.size], FLING), pannedM)
                pannedK++
            }
            pan = times(panTurn(PAN[k % PAN.size], scroll.first - k * FLING), pannedM)
        }
        val gyro: Double? = if (look == Look.WorkingGyro) (t / 5000) * TAU else null
        val pitch = ((config.tilt + (gyro?.let { 10 * cos(it) } ?: 0.0)) * PI) / 180
        val roll = gyro?.let { ((12 * sin(it)) * PI) / 180 } ?: 0.0
        val sr = sin(roll)
        val cr = cos(roll)
        val sy = sin(yaw)
        val cy = cos(yaw)
        val st = sin(pitch)
        val ct = cos(pitch)
        fun facing(k: Int) = pts[k].y * st + (-pts[k].x * sy + pts[k].z * cy) * ct

        val lit = HashMap<Int, Double>()
        if (reasoning) {
            val s = t / HOP
            val n = floor(s).toInt()
            val f = s - floor(s)
            if (walks[0].isEmpty()) {
                // The first walker starts at the dot facing you most; a second, at a front dot well away from it.
                fun argmax(score: (Int) -> Double) = pts.indices.fold(0) { best, i -> if (score(i) > score(best)) i else best }
                val first = argmax(::facing)
                for (w in walks.indices) walks[w] += if (w != 0) argmax { facing(it) + dist2(pts[it], pts[first]) } else first
            }
            hops = max(hops, n - WALK)
            while (hops < n) {
                for (w in walks.indices) {
                    // Hop to the neighbour that faces you most, with a little chance mixed in so it wanders.
                    val walk = walks[w]
                    val recent = walk.takeLast(8)
                    val from = walk.last()
                    var best = -1
                    var score = Double.NEGATIVE_INFINITY
                    val other = if (look == Look.ReasoningTwins) walks[1 - w].lastOrNull() else null
                    for ((j, k) in near[from].withIndex()) {
                        val apart = other?.let { 1.2 * min(sqrt(dist2(pts[k], pts[it])), 0.8) } ?: 0.0
                        val sc = facing(k) + 0.35 * hash((hops * 31 + j + w * 977).toDouble()) + apart
                        if (k !in recent && sc > score) {
                            score = sc
                            best = k
                        }
                    }
                    walk += if (best < 0) near[from][0] else best
                    if (walk.size > WALK) walk.removeAt(0)
                }
                hops++
            }
            for (walk in walks) {
                for (j in TAIL - 1 downTo 0) {
                    if (walk.size - 1 - j < 0) continue
                    val k = walk[walk.size - 1 - j]
                    lit[k] = max(lit[k] ?: 0.0, if (j == 0) ease(min(1.0, f * 2)) else 1 - ((j - 1) + f) / TAIL)
                }
            }
        }
        // Waiting: a comet's head laps every 2s on screen, spiralling from 70° north to 70° south every 6s.
        val head = (t / 2000) * TAU + yaw
        val ahead = TAU / 2000 + TAU / period
        fun headLat(tt: Double) = ((70 * PI) / 180) * (1 - 2 * (fmod(tt, 6000.0) / 6000))
        val glow = min(1.0, 3 * sin(PI * (fmod(t, 6000.0) / 6000)))
        val lens = if (look == Look.Searching) lensAt(t) else null
        val tw = if (look == Look.WorkingGyro) 0.5 * sin((t / 2600) * TAU) else if (look == Look.CompactingSqueeze) sin((t / 2600) * TAU) else 0.0
        var sweepAt = 0.0
        var sweepHold = 0.0
        if (compacting) {
            val u = fmod(t, 2800.0) / 2800
            val s = (u - 0.7) / 0.3
            val release = if (look == Look.CompactingFuse) (1 - s).pow(3)
                else if (s < 0.45) 1 - 1.25 * ease(s / 0.45) else if (s < 0.7) -0.25 * sq(1 - (s - 0.45) / 0.25) else 0.0
            sweepAt = -1.15 + 2.3 * min(1.0, u / 0.7)
            sweepHold = if (u < 0.7) 1.0 else release
        }

        var tap = if (look == Look.UsingTap) tapAt(t) else null
        val outline = look == Look.Using
        if (outline) {
            tap = if (way != null) aimAt(t, (way * PI) / 180) else {
                val p = tapAt(t)
                Tap(tipOf(p.at), tipOf(p.click), p.since)
            }
        }
        val shrink = if (outline) 1 - 0.15 * pressOf(tap!!.since) else 1.0
        val type = if (look == Look.UsingType) typeAt(t) else null
        val zoom = if (look == Look.UsingZoom) zoomAt(t) else null
        val flash = if (look == Look.UsingSnap) snapAt(t) else null
        val lids = if (look == Look.IdleBlink) blinkAt(t) else null
        val rec = if (look == Look.UsingRecord) recAt(t) else null

        for ((i, p) in pts.withIndex()) {
            val x = p.x
            val y = p.y
            val z = p.z
            // Twist turns each dot by an angle that grows with its height: top and bottom opposite ways.
            val turn = yaw + TWIST * tw * y
            val ly = if (tw != 0.0) sin(turn) else sy
            val lc = if (tw != 0.0) cos(turn) else cy
            val z1 = -x * ly + z * lc
            var vx = x * lc + z * ly
            var vy = y * ct - z1 * st
            var vz = y * st + z1 * ct
            pan?.let { m ->
                val nx = m[0] * vx + m[1] * vy + m[2] * vz
                val ny = m[3] * vx + m[4] * vy + m[5] * vz
                val nz = m[6] * vx + m[7] * vy + m[8] * vz
                vx = nx; vy = ny; vz = nz
            }
            val d = (vz + 1) / 2
            var r = (0.5 + 1.4 * d) * rs
            var a = max(0.0, (d - 0.3) / 0.7)
            if (lens != null) {
                val ang = acos(min(1.0, (vx * lens.x + vy * lens.y + vz * lens.z) / len(V3(vx, vy, vz))))
                val w = if (ang < LENS) sq(1 - sq(ang / LENS)) else 0.0
                a *= 1 - 0.55 * (1 - w)
                if (size <= 24) r *= 1 + 0.5 * w
                if (w != 0.0) {
                    vx *= 1 + 0.12 * w
                    vy *= 1 + 0.12 * w
                    vx += (vx - lens.x) * 0.35 * w
                    vy += (vy - lens.y) * 0.35 * w
                    r *= 1 + 0.9 * w
                    a += (1 - a) * w
                }
            }
            if (compacting) {
                val q = vx
                val w = min(1.0, max(0.0, (sweepAt - q) / 0.2)) * sweepHold
                val k = if (look == Look.Compacting) 1.5 else 1.0
                vx *= 1 - 0.2 * k * w
                vy *= 1 - 0.2 * k * w
                r *= 1 - 0.3 * k * w
                if (look == Look.CompactingFuse) {
                    a *= 1 - 0.5 * w
                    val g = exp(-sq((q - sweepAt) / 0.08)) * max(0.0, sweepHold) * min(1.0, d / 0.5)
                    r *= 1 + 0.8 * g
                    a += (1 - a) * g
                }
            }
            if (look == Look.Working) {
                // Every 1.7s a ring of light runs down the sphere over 1.2s; what it's passed pulls in, then lets go.
                val u = fmod(t, 1700.0)
                val at = 1.3 - 2.6 * ease(min(1.0, u / 1200))
                val q = vx * RING_AXIS.x + vy * RING_AXIS.y + vz * RING_AXIS.z
                val g = if (u < 1200) exp(-sq((q - at) / 0.2)) else 0.0
                r *= 1 + 0.6 * g
                a += (1 - a) * g
                val w = min(1.0, max(0.0, (q - at) / 0.2)) * (if (u < 1200) 1.0 else 1 - min(1.0, 1.6 * ((u - 1200) / 800)))
                vx *= 1 - 0.08 * w
                vy *= 1 - 0.08 * w
                r *= 1 - 0.15 * w
            }
            if (look == Look.SearchingLighthouse) {
                // A beam leaning 30° right circles the axis every 2.5s, its trail dying out 90° behind it.
                a *= 0.5
                val lr = sin(LEAN)
                val lnc = cos(LEAN)
                val across = vx * lnc - vy * lr
                val toward = -st * (vx * lr + vy * lnc) + ct * vz
                val off = atan2(across, toward) - (fmod(t / 2500, 1.0) * TAU - PI)
                val dphi = fmod(fmod(off + PI, TAU) + TAU, TAU) - PI
                val beam = if (dphi < 0) max(0.0, 1 + dphi / TRAIL) else exp(-sq(dphi / 0.45))
                val g = beam * (0.25 + 0.75 * min(1.0, max(0.0, (d - 0.4) / 0.3)))
                r *= 1 + 0.6 * g
                a += (1 - a) * g
            }
            if (reasoning) {
                val spark = lit[i] ?: 0.0
                a *= 0.5
                if (spark != 0.0) {
                    r *= 1 + 0.8 * spark
                    a += (1 - a) * spark
                }
            }
            if (look == Look.Waiting) {
                // A sharp head and a long fading tail, its width measured along the surface.
                val n = len(p)
                val lat = asin(y / (if (n != 0.0) n else 1.0))
                val lon = atan2(z, x)
                val off = atan2(sin(lon - head), cos(lon - head))
                val along = off * cos(lat)
                val g = exp(-sq((lat - headLat(t + off / ahead)) / 0.28)) * exp(-sq(along / (if (off * ahead > 0) 0.12 else 1.0)))
                val w = glow * g.pow(0.6)
                a = a * 0.5 + (1 - a * 0.5) * w
                r *= 1 + 1.1 * w
            }
            if (tap != null) {
                val n0 = len(V3(vx, vy, vz))
                val n = if (n0 != 0.0) n0 else 1.0
                fun off(q: V3) = acos(min(1.0, max(-1.0, (vx * q.x + vy * q.y + vz * q.z) / n)))
                a *= if (outline) 0.25 else 0.5
                // A click dents what's under it for 300ms, and a ring runs out from it, fading.
                val s = tap.since
                val ptr = if (outline) 0.0 else bump(off(tap.at), PTR)
                val ak = off(tap.click)
                val press = pressOf(s)
                val pw = press * bump(ak, PRESS)
                val run = min(1.0, s / RIPPLE_MS)
                val ring = exp(-sq((ak - (0.15 + 1.3 * (1 - sq(1 - run)))) / 0.18)) * sq(1 - run)
                vx *= 1 - 0.14 * pw
                vy *= 1 - 0.14 * pw
                r *= (1 - 0.35 * pw) * (1 + 0.7 * max(ring, ptr * (1 - press)))
                a += (1 - a) * max(ptr, ring)
                if (outline && inside(ARROW, (vx - tap.at.x) / shrink, (tap.at.y - vy) / shrink)) {
                    val l = min(1.0, max(0.0, (d - 0.5) / 0.2))
                    r *= 1 + 0.15 * l
                    a += (1 - a) * l
                }
            }
            if (type != null) {
                // The paragraph lights cell by cell as it's typed, the newest letter brightest; the caret is an upright bar.
                a *= 0.25
                val row = floor((TOP - vy) / LEAD + 0.5).toInt()
                val col = floor((vx - LEFT) / CELL).toInt()
                var g = 0.0
                if (row in KEY_OF.indices && col in KEY_OF[row].indices) {
                    val key = KEY_OF[row][col]
                    if (key < type.n && TEXT[row][col] == 'x' && abs(TOP - row * LEAD - vy) < 0.085) {
                        g = 0.75 + (if (key == type.n - 1) 0.25 * exp(-type.since / 120) else 0.0)
                    }
                }
                if (abs(vy - type.caret.second) < 0.1) g = max(g, type.blink * exp(-sq((vx - type.caret.first) / 0.04)))
                a += (1 - a) * g * type.fade * min(1.0, max(0.0, (d - 0.5) / 0.2))
            }
            if (zoom != null && zoom != 0.0) {
                val w = zoom * max(0.0, vz)
                vx *= 1 + 0.45 * w
                vy *= 1 + 0.45 * w
                r *= 1 + 0.8 * w
                a *= min(1.0, max(0.0, (1.05 - sqrt(vx * vx + vy * vy)) / 0.1))
            }
            if (scroll != null) a *= 0.55 + 0.45 * scroll.second
            if (flash != null) {
                a *= 0.55
                r *= 1 + 0.25 * flash
                a += (1 - a) * flash
            }
            if (lids != null) {
                val edge = exp(-sq((abs(vy) - lids) / 0.06)) * (if (lids < 1.2) 1.0 else 0.0)
                a *= min(1.0, max(0.0, (lids - abs(vy)) / 0.08))
                r *= 1 + 0.4 * edge
                a += (1 - a) * edge * min(1.0, max(0.0, (d - 0.4) / 0.3))
            }
            if (rec != null) {
                vx *= 0.92 + 0.08 * rec
                vy *= 0.92 + 0.08 * rec
                a *= 0.3 + 0.7 * rec
            }
            if (roll != 0.0) {
                val nx = vx * cr - vy * sr
                vy = vx * sr + vy * cr
                vx = nx
            }
            dot(c + vx * bigR, c - vy * bigR, r, a)
        }
    }
}
