import Chart from 'chart.js/auto';

let chart;
let dragRect = null; // ✅ 드래그 영역 저장용
let ctx = null;

onmessage = (e) => {
    const { canvas, type, data, rect, event } = e.data;

    if (canvas) {
        ctx = canvas.getContext("2d");
        chart = new Chart(ctx, {
            type: "scatter",
            data: { datasets: [] },
            options: {
                animation: false,
                responsive: false,
                plugins: {
                    legend: { display: false },
                    tooltip: { enabled: false } // ❌ Chart.js 기본 툴팁 비활성화
                },
                scales: {
                    x: { type: "linear", min: -0.5, grid: { display: false } },
                    y: { beginAtZero: true }
                }
            }
        });
    }

    if (type === "updateData" && chart) {
        const colorByPosition = { A: "#e74c3c", B: "#2e86de", C: "#2ecc71" };

        const dates = [...new Set(data.map(d => d.dataTime))];
        const wfNamesByDate = {};
        let maxWfPerDate = 0;
        dates.forEach(date => {
            const names = [...new Set(data.filter(d => d.dataTime === date).map(d => d.wfName))];
            wfNamesByDate[date] = names;
            if (names.length > maxWfPerDate) maxWfPerDate = names.length;
        });

        const groupTotalWidth = 0.8;
        const intraSpacing = maxWfPerDate > 1 ? groupTotalWidth / maxWfPerDate : 0;

        const positions = [...new Set(data.map(d => d.position))];
        const datasets = positions.map(pos => ({
            label: pos,
            data: [],
            backgroundColor: colorByPosition[pos] || "#888",
            pointRadius: 3,
        }));

        data.forEach(item => {
            const dateIndex = dates.indexOf(item.dataTime);
            const wfList = wfNamesByDate[item.dataTime];
            const wfIndex = wfList.indexOf(item.wfName);
            const offset = intraSpacing * (wfIndex - (wfList.length - 1) / 2);
            const x = dateIndex + offset;
            const ds = datasets.find(d => d.label === item.position);
            ds.data.push({ x, y: item.wfValue, raw: item });
        });

        chart.data.datasets = datasets;
        chart.update('none');
    }

    // ✅ 드래그 중 표시용 (줌 기능 제거)
    if (type === "dragging" && ctx && chart) {
        dragRect = rect;
        chart.draw();
        drawDragRect();
    }

    // ✅ 드래그 종료 시 사각형 제거
    if (type === "dragEnd" && ctx && chart) {
        dragRect = null;
        chart.draw();
    }

    // ✅ 툴팁 처리
    if (type === "hover" && chart) {
        const { x, y } = event;
        const elements = chart.getElementsAtEventForMode({ x, y }, "nearest", { intersect: true }, false);

        if (elements.length > 0) {
            const el = elements[0];
            const datasetIndex = el.datasetIndex;
            const index = el.index;
            const data = chart.data.datasets[datasetIndex].data[index].raw;

            self.postMessage({
                type: "tooltip",
                payload: { x, y, data },
            });
        } else {
            self.postMessage({
                type: "tooltip",
                payload: null,
            });
        } if (dragging.value) {
            dragEnd.x = e.offsetX;
            dragEnd.y = e.offsetY;

            // ✅ 드래그 사각형 표시용
            worker.postMessage({
                type: "dragging",
                rect: {
                    x1: Math.min(dragStart.x, dragEnd.x),
                    x2: Math.max(dragStart.x, dragEnd.x),
                    y1: Math.min(dragStart.y, dragEnd.y),
                    y2: Math.max(dragStart.y, dragEnd.y),
                },
            });
        }

        // ✅ 마우스 위치 전달 (툴팁)
        worker.postMessage({
            type: "hover",
            event: { x: e.offsetX, y: e.offsetY },
        });
    }
};

// ✅ 드래그 중 사각형을 그림
function drawDragRect() {
    if (!dragRect || !ctx) return;
    const { x1, y1, x2, y2 } = dragRect;
    const w = x2 - x1;
    const h = y2 - y1;

    ctx.save();
    ctx.fillStyle = "rgba(30, 144, 255, 0.2)";
    ctx.strokeStyle = "rgba(30, 144, 255, 0.8)";
    ctx.lineWidth = 1.5;
    ctx.fillRect(x1, y1, w, h);
    ctx.strokeRect(x1, y1, w, h);
    ctx.restore();
}
