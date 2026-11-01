# Retired Trading Features

Futures Protection, Fib Bot, 5-Min Fib, Crypto Fib and Gap Pullback Paper were retired on 2026-11-01
after the owner destroyed the trading droplet. They are absent from Research.
Old screen paths redirect to Research without mounting polling/credential-sync UI.

The central source archive, hash manifest, architecture notes, recovery limits and
step-by-step restoration guide are maintained in the dashboard repository:

`archive/trading-features/README.md`

Repository: https://github.com/mistercap15/NSE-Dashboard/tree/master/archive/trading-features

Its `source/nse-mobile/` directory contains the exact pre-retirement screens,
components, queries, types and navigation, using `.source` suffixes. The same
archive includes dashboard routes/strategy logic, executor source/service units,
tests and crypto research source. No credentials or server runtime state are
backed up there. Restore by review branch; never blindly replace shared files.

No native dependencies/runtime changes are needed. Publish to the installed
build's verified EAS channel/runtime after typecheck, tests and Android export.
The dashboard must also deploy its 410 API stubs to protect outdated app builds.

Hiding features is not broker order cancellation. Do not delete device storage
or enable any bot while restoring archived UI.

The Gap Paper supplement also preserves the historical-pilot screen, comparison
and session-status components, helpers and bundled historical results. Both old
Gap Paper deep links redirect to Research. The dashboard scanner/account/pilot
APIs return 410 and cannot pause, resume, reset or contact remote storage.
