---
title: "What's The Best Representation For Robotic Policy?"
date: "2026-10-07"
summary: "探讨包含完成任务所需的所有信息且data-efficient的representation到底是什么？"
tags: ["Robot Manipulation"]
published: true
math: true
editing_time_seconds: 106
---

"Open-world" manipulation requires: rich perceptual understanding of the environment 纯粹的VLA工作探讨了很多种Observation的representation, 最简单的**单摄像头 RGB, Multi-View RGB, 3D scene reconstruction, SE(3) trajectory, 2D flow , 3D flow** , **optical flow** ; 下面列举这些工作的代表性工作，分析每个representation的优劣

## RGB: $\pi_0$ 

## Multi-View RGB

## 3D reconstruction

3D重建可以提供完整的场景信息给policy而不受viewpoint的影响， 需要考虑的点在于如何快速地完成3D重建同时不输入冗余信息给policy

## Trajectory+RGB

trajectory
