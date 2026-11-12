# Righteous Republic

A space combat and exploration game with solo campaigns, cooperative missions and an authoritative shared universe. Players choose a faction, manage their ship’s hull and equipment, fight, mine, trade and progress through the available sectors. The gameplay and network contracts remain defined by the existing simulation modules and README.

<!-- display-localization:start -->

### Display language

Authored UI text, canvas labels, selector options and composed messages resolve through the packaged string catalog. Message keys are stable hashes, so long story passages fit the runtime’s string-key limit. Display translation preserves simulation and protocol values, interpolated player names and entered text. The source English catalog is shipped; additional languages are available only when their entire catalog has validated translations.

The language panel opens with F2, saves the player’s choice and offers Automatic to follow the account or device language. Packaged script fonts apply to both native and browser text. Touch button labels follow the selected language immediately, including changes during play.

<!-- display-localization:end -->

<!-- regional-localization:start -->

### Regional interface languages

The string tables include complete regional variants for `en-SG`, `en-HK`, `en-BQ`, `fr-BE`, `de-BE`, `de-BR`, `es-CO`, `de-IT`, `fr-IT`, `es-CL`, `es-AR`, `es-EC`. These reuse the corresponding existing translations in their language family. The runtime can resolve the exact regional tag. Language selection is available from the game’s Options panel or F2 and is saved per player in `ui.language`. Changes apply during play. Additional national, regional and indigenous language packs are only shipped once every English message has a translation with intact placeholders and markup. Complete additional language tables: `nl-BE`, `nl-NL`, `ja-JP`, `zh-SG`, `ms-SG`, `ta-SG`, `zh-HK`, `yue-HK`, `fi-FI`, `sv-FI`, `ru-FI`, `et-EE`, `ru-EE`, `id-ID`, `vi-VN`, `da-DE`, `lb-BE`, `co-FR`, `eu-FR`, `ca-FR`, `oc-FR`, `sl-IT`, `fur-IT`, `ca-IT`, `oc-IT`, `ca-ES`, `eu-ES`, `gl-ES`, `su-ID`, `bew-ID`, `km-VN`.

<!-- regional-localization:end -->
