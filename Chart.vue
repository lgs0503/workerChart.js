<template>
  <div class="chart-wrap" @mousemove="handleMouseMove" @mousedown="startDrag" @mouseup="endDrag">
    <canvas ref="chartCanvas"></canvas>
    <!-- HTML 툴팁 -->
    <div v-if="tooltip.visible" class="tooltip" :style="{ left: tooltip.x + 'px', top: tooltip.y + 'px' }">
      {{ tooltip.text }}
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, reactive, onBeforeUnmount } from "vue";

const chartCanvas = ref(null);
let worker = null;

const tooltip = reactive({
  visible: false,
  x: 0,
  y: 0,
  text: "",
});

const dragging = ref(false);
const dragStart = reactive({ x: 0, y: 0 });
const dragEnd = reactive({ x: 0, y: 0 });

const rawData = [];
for (let i = 0; i < 30; i++) {
  for (let j = 0; j < 200; j++) {
    rawData.push({
      wfName: 'W' + j,
      wfValue: Math.floor((Math.random() * (40 - 1)) + 1),
      position: "C",
      dataTime: i + "일",
    });
  }
}

onMounted(() => {
  const canvas = chartCanvas.value;
  canvas.width = 1800;
  canvas.height = 520;

  const offscreen = canvas.transferControlToOffscreen();
  worker = new Worker(new URL('../worker/chartWorker.js', import.meta.url), { type: 'module' });
  worker.postMessage({ canvas: offscreen }, [offscreen]);
  worker.postMessage({ type: 'updateData', data: rawData });

  // ✅ Worker에서 툴팁 정보 수신
  worker.onmessage = (e) => {
    const { type, payload } = e.data;
    if (type === "tooltip") {
      if (payload) {
        tooltip.visible = true;
        tooltip.x = payload.x + 10;
        tooltip.y = payload.y + 10;
        tooltip.text = `${payload.data.dataTime} / ${payload.data.wfName} / ${payload.data.position} : ${payload.data.wfValue}`;
      } else {
        tooltip.visible = false;
      }
    }
  };
});

function handleMouseMove(e) {
  if (dragging.value) {
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
}

function startDrag(e) {
  dragging.value = true;
  dragStart.x = e.offsetX;
  dragStart.y = e.offsetY;
  dragEnd.x = e.offsetX;
  dragEnd.y = e.offsetY;
}

function endDrag() {
  if (!dragging.value) return;
  dragging.value = false;

  // ✅ 드래그 사각형 제거
  worker.postMessage({
    type: "dragEnd",
  });
}

onBeforeUnmount(() => {
  worker?.terminate();
});
</script>

<style scoped>
.chart-wrap {
  position: relative;
  width: 100%;
  height: 520px;
}
.tooltip {
  position: absolute;
  background: rgba(0, 0, 0, 0.8);
  color: white;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  pointer-events: none;
}
</style>
