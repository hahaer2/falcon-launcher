# 猎鹰九号 · 三维发射任务

基于 **Vite + Three.js** 的猎鹰九号风格运载火箭发射体验：PBR 材质、实时阴影、发射台与脐带塔、九机尾焰、烟雾粒子、级间分离，以及中文任务直播 UI。

## 一键运行

```bash
cd /workspace/rocket
npm install
npm run dev
```

浏览器打开终端提示的本地地址（默认 [http://localhost:5173](http://localhost:5173)）。

生产构建：

```bash
npm run build
npm run preview
```

## 操作

1. 调节**燃料**、**推力**、**偏航**
2. 点击**点火**（九台梅林发动机预燃，发射台震动、烟雾）
3. 点击**发射**，进入 T−10 倒计时后升空
4. 一级燃料下降或高度足够后自动**级间分离**，二级真空发动机关机后继续加速
5. 达到预定高度即入轨成功；坠地过快则任务失败
6. **跟随相机**（默认开）跟踪箭体；关闭后可用鼠标 **OrbitControls** 环绕观察

鼠标拖拽旋转、滚轮缩放；跟随模式下仍可微调视角。

## 场景

- 分段箭体：一级（栅格舵 / 着陆腿 / 九机 octaweb）、级间段、二级、整流罩
- 混凝土发射台、火焰导流槽、脐带塔 / 强背、探照灯
- PBR（`MeshPhysicalMaterial`）+ 方向光阴影 + 台面聚光
- 尾焰锥体（加色混合）与火花 / 烟雾粒子场

## 技术栈

- [Vite](https://vitejs.dev/)
- [three](https://threejs.org/)（`OrbitControls`）
