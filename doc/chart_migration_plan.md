# Chart Library Migration Plan: Lightweight-Charts to ECharts

This document outlines the proposal to migrate the primary charting engine from `lightweight-charts` to `Apache ECharts`.

## Why Migrate?

1.  **Remove Branding**: `lightweight-charts` enforces TradingView branding/logo in the free version. ECharts is open-source (Apache License) and allows for a clean, brand-free UI.
2.  **Advanced Aesthetics**: ECharts supports complex gradients, smoother animations, and rich interactivity that feels more "premium."
3.  **Multi-Grid Architecture**: Instead of 3 synchronized instances, ECharts can handle multiple panes (Price, Foreigner, Institution) within a **single canvas**, which naturally simplifies synchronization of zoom, pan, and crosshairs.
4.  **Flexible Tooling**: Native support for brush selection, data zooming tools, and more sophisticated tooltip layouts.

## Features to Carry Over

The migration must maintain or improve the following features currently implemented:

- [ ] **3-Pane Stacked Layout**: Price (Candle), Foreigner (Bar), Institution (Bar).
- [ ] **Technical Indicators**:
    - [ ] SMA (Configurable periods: 5/20/60).
    - [ ] EMA (Configurable periods: 12/26).
    - [ ] Bollinger Bands (Configurable: 20 period, 2 StdDev).
- [ ] **Indicator Settings Dialog**: Interactive modal to customize colors, periods, and visibility.
- [ ] **Strict Synchronization**: Shared `dataZoom` and `axisPointer` across all grids.
- [ ] **Dark Mode Support**: Seamless transition between light and zinc-900 themes.

## Technical Strategy

1.  **Install Dependencies**: `npm install echarts echarts-for-react`.
2.  **Logic Port**: Move existing calculation helpers (`calculateSMA`, `calculateEMA`, `calculateBollingerBands`) to a shared utility file if possible.
3.  **Component Rewrite**:
    - Replace the triple-ref setup with a single ECharts `option` structure.
    - Map `priceData` and `supplyData` to ECharts `dataset` or `series`.
4.  **Sync Logic**: Use `connect` or shared `dataZoom` index to align the X-axis of all three panes.
5.  **Settings Integration**: Re-wire the existing `config` state to the ECharts `setOption` call.

## Estimated Difficulty
- **Complexity**: Medium-High
- **Effort**: ~4-8 targetted development steps.
