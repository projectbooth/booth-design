import { ModuleStoreApp } from "@projectbooth/module-store-ui";
import "@projectbooth/module-store-ui/dist/style.css";
import { MODULE_STORE_SLOT_ID, registerNativeModule } from "@/lib/nativeModules";

/**
 * Every native-mode module's npm package gets registered here, per ADR 0030
 * (../booth-architecture/decisions/0030-native-module-ui-delivered-as-npm-package.md).
 * Imported once, for its side effects, from src/main.tsx before the app renders.
 *
 * Module Store: wired in against @projectbooth/module-store-ui@0.1.0, whose
 * ModuleStoreAppProps matches this repo's NativeModuleProps (ADR 0031) exactly —
 * workspace/role/theme, confirmed by reading its shipped .d.ts, not assumed.
 *
 * KNOWN BROKEN against a real booth-core until fixed on the other side: this
 * package's own web/src/api/client.ts still sends `credentials: "include"` and
 * attaches no bearer token at all — the same wrong cookie-based auth assumption
 * ADR 0032 corrected here (src/lib/api/client.ts), just not yet on that side. Every
 * API call this component makes will 401 once mounted against a real, bearer-only
 * booth-core. Flagged to booth-module-store's agent directly, proposing the same
 * props-not-context extension already established (ADR 0031): an `accessToken`
 * field on ModuleStoreAppProps, sourced from this repo's
 * `getAccessToken()` (src/lib/auth/tokenStore.ts) — exactly the open question ADR
 * 0032's own consequences section anticipated ("the exact mechanism for how a
 * mounted native component accesses the token booth-design obtained isn't specified
 * by this ADR either... left as an implementation detail between booth-design and
 * native modules"). Registered anyway rather than left out, since the component
 * itself, structurally, is correct and this is the real integration point — worth
 * having wired up and visibly broken over not wired up at all.
 */
registerNativeModule(MODULE_STORE_SLOT_ID, ModuleStoreApp);
