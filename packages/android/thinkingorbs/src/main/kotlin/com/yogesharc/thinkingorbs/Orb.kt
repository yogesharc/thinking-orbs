package com.yogesharc.thinkingorbs

import android.database.ContentObserver
import android.os.Handler
import android.os.Looper
import android.provider.Settings
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.size
import androidx.compose.material3.LocalContentColor
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableLongStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.runtime.withFrameMillis
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.role
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import kotlin.math.max
import kotlin.math.min
import kotlin.math.roundToInt

/**
 * An animated status indicator for what an AI agent is doing: a [state], and optionally one of that
 * state's [variant]s. It draws in [color], the content color by default like an `Icon`, and every orb
 * is tuned to read at 20dp. With animations turned off in the system's settings it holds still.
 *
 * @param size Width and height.
 * @param speed 1 is as designed, 0.5 half speed, 2 double. Every motion scales together.
 * @param paused Holds it on its frame.
 * @param label What TalkBack reads, like "Thinking". Without one the orb is hidden from it.
 * @param density How many dots, as a multiple of the tuned count.
 * @param dotSize How big each dot is, as a multiple of the tuned size.
 * @param tilt How far it's seen from above, in degrees: 0 side on, 90 straight down.
 * @param direction Which way Using · Scroll scrolls, and which side Using clicks on. Without one they go anywhere.
 */
@Composable
public fun Orb(
    state: OrbState = OrbState.Idle,
    modifier: Modifier = Modifier,
    variant: OrbVariant = OrbVariant.Default,
    size: Dp = 20.dp,
    color: Color = LocalContentColor.current,
    speed: Double = 1.0,
    paused: Boolean = false,
    label: String? = null,
    density: Double = 1.0,
    dotSize: Double = 1.0,
    tilt: Double = 20.0,
    direction: OrbDirection? = null,
) {
    val config = OrbConfig(Look.of(state, variant), size.value.toDouble(), density, dotSize, tilt, direction)
    val engine = remember(config) { OrbEngine(config) }
    val still = animationsOff()
    // The frame clock is read in the draw phase alone, so a turning orb redraws without recomposing its row.
    var now by remember { mutableLongStateOf(0L) }
    LaunchedEffect(paused, still) {
        if (paused || still) return@LaunchedEffect
        while (true) withFrameMillis { now = it }
    }
    // The time this orb last drew. Paused, it keeps to it, though others of its look carry the shared clock on.
    val drawn = remember { doubleArrayOf(Double.NaN) }
    val clock = "${config.look.key}@$speed"
    val described = if (label != null) Modifier.semantics { contentDescription = label; role = Role.Image } else Modifier
    Canvas(modifier.size(size).then(described)) {
        val t = when {
            still -> 0.0
            paused && !drawn[0].isNaN() -> drawn[0]
            else -> tick(clock, now.toDouble(), speed).also { drawn[0] = it }
        }
        val k = this.size.width / config.size.toFloat()
        engine.draw(t) { x, y, r, a ->
            // Opacity to two places like the web's; no dot drops below 0.45dp, or it renders as a grey haze.
            val o = min(100, (a * 100).roundToInt())
            if (o > 0) drawCircle(color, (max(0.45, r) * k).toFloat(), Offset((x * k).toFloat(), (y * k).toFloat()), alpha = o / 100f)
        }
    }
}

/** Whether animations are off in the system's settings, kept up to date as the user changes them. */
@Composable
private fun animationsOff(): Boolean {
    val resolver = LocalContext.current.contentResolver
    fun read() = Settings.Global.getFloat(resolver, Settings.Global.ANIMATOR_DURATION_SCALE, 1f) == 0f
    var off by remember(resolver) { mutableStateOf(read()) }
    DisposableEffect(resolver) {
        val observer = object : ContentObserver(Handler(Looper.getMainLooper())) {
            override fun onChange(selfChange: Boolean) {
                off = read()
            }
        }
        resolver.registerContentObserver(Settings.Global.getUriFor(Settings.Global.ANIMATOR_DURATION_SCALE), false, observer)
        off = read()
        onDispose { resolver.unregisterContentObserver(observer) }
    }
    return off
}
