plugins {
    id("com.android.library")
    id("org.jetbrains.kotlin.android")
    id("org.jetbrains.kotlin.plugin.compose")
    `maven-publish`
}

android {
    namespace = "com.yogesharc.thinkingorbs"
    compileSdk = 35

    defaultConfig {
        minSdk = 21
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions { jvmTarget = "17" }
    buildFeatures { compose = true }
    publishing {
        singleVariant("release") { withSourcesJar() }
    }
}

kotlin { explicitApi() }

dependencies {
    implementation(platform("androidx.compose:compose-bom:2024.12.01"))
    implementation("androidx.compose.foundation:foundation")
    // Only for LocalContentColor, so the orb takes the text color around it as an Icon does.
    implementation("androidx.compose.material3:material3")
}

// JitPack builds from a tag and sets GROUP and VERSION, which makes it com.github.yogesharc:thinking-orbs:<tag>.
publishing {
    publications {
        register<MavenPublication>("release") {
            groupId = System.getenv("GROUP") ?: "com.github.yogesharc"
            artifactId = "thinking-orbs"
            version = System.getenv("VERSION") ?: "dev"
            afterEvaluate { from(components["release"]) }
        }
    }
}
