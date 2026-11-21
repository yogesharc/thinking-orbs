package com.yogesharc.thinkingorbs.gallery

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.WindowInsetsSides
import androidx.compose.foundation.layout.asPaddingValues
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.only
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.safeDrawing
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import com.yogesharc.thinkingorbs.Orb
import com.yogesharc.thinkingorbs.OrbState
import com.yogesharc.thinkingorbs.OrbVariant

/** Every state and variant, big and at the 20dp they're tuned for, to hold up against thinkingorbs.com/playground. */
class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            MaterialTheme(if (isSystemInDarkTheme()) darkColorScheme() else lightColorScheme()) {
                Surface(Modifier.fillMaxSize()) { Gallery() }
            }
        }
    }
}

private val looks = OrbState.entries.flatMap { state -> state.variants.map { state to it } }

private fun name(state: OrbState, variant: OrbVariant) =
    if (variant == OrbVariant.Default) state.name else "${state.name} · ${variant.name}"

@Composable
private fun Gallery() {
    // Rows stop at the status bar but scroll on under the gesture bar.
    LazyColumn(
        Modifier.windowInsetsPadding(WindowInsets.safeDrawing.only(WindowInsetsSides.Top + WindowInsetsSides.Horizontal)),
        contentPadding = WindowInsets.safeDrawing.only(WindowInsetsSides.Bottom).asPaddingValues(),
    ) {
        items(looks) { (state, variant) ->
            Row(Modifier.padding(horizontal = 20.dp, vertical = 12.dp), Arrangement.spacedBy(24.dp), Alignment.CenterVertically) {
                Orb(state, variant = variant, size = 64.dp)
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
                    Orb(state, variant = variant)
                    Text(name(state, variant), style = MaterialTheme.typography.bodyLarge)
                }
            }
            HorizontalDivider(Modifier.padding(start = 20.dp))
        }
    }
}
