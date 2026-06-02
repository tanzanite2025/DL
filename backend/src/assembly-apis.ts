// ==================== BOM 组装功能 API ====================
// 将这段代码复制到 server.ts 中 app.listen 之前

// ---------------------- BOM 配置 API ----------------------

// 获取所有已配置 BOM 的成品列表
app.get('/api/bom', authenticateToken, requirePermission('canAccessAssembly'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const items = await prisma.item.findMany({
      where: {
        type: 'PRODUCT',
        bomComponents: {
          some: {}
        }
      },
      include: {
        bomComponents: {
          include: {
            componentItem: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    return res.json(items);
  } catch (error) {
    console.error('[CRITICAL] 获取 BOM 列表失败：', error);
    return res.status(500).json({ error: '[CRITICAL] 获取 BOM 列表失败。' });
  }
});

// 获取指定成品的 BOM 清单
app.get('/api/bom/:itemId', authenticateToken, requirePermission('canAccessAssembly'), async (req: AuthenticatedRequest, res: Response) => {
  const { itemId } = req.params;
  try {
    const bom = await prisma.bomComponent.findMany({
      where: { parentItemId: itemId },
      include: {
        componentItem: true
      },
      orderBy: { createdAt: 'asc' }
    });
    return res.json(bom);
  } catch (error) {
    console.error('[CRITICAL] 获取 BOM 清单失败：', error);
    return res.status(500).json({ error: '[CRITICAL] 获取 BOM 清单失败。' });
  }
});

// 创建/更新 BOM 配置（批量保存）
app.post('/api/bom', authenticateToken, requirePermission('canAccessAssembly'), async (req: AuthenticatedRequest, res: Response) => {
  const { parentItemId, components } = req.body;
  
  if (!parentItemId || !Array.isArray(components)) {
    return res.status(400).json({ error: '[CRITICAL] 缺少必要参数。' });
  }

  try {
    // 验证成品存在且类型为 PRODUCT
    const parentItem = await prisma.item.findUnique({ where: { id: parentItemId } });
    if (!parentItem) {
      return res.status(404).json({ error: '[CRITICAL] 成品不存在。' });
    }
    if (parentItem.type !== 'PRODUCT') {
      return res.status(400).json({ error: '[CRITICAL] 只能为成品类型的物料配置 BOM。' });
    }

    // 删除旧的 BOM 配置
    await prisma.bomComponent.deleteMany({
      where: { parentItemId }
    });

    // 创建新的 BOM 配置
    if (components.length > 0) {
      await prisma.bomComponent.createMany({
        data: components.map((c: any) => ({
          parentItemId,
          componentItemId: c.componentItemId,
          quantity: parseInt(c.quantity),
          remarks: c.remarks || null
        }))
      });
    }

    // 返回更新后的 BOM
    const newBom = await prisma.bomComponent.findMany({
      where: { parentItemId },
      include: {
        componentItem: true
      }
    });

    return res.json(newBom);
  } catch (error) {
    console.error('[CRITICAL] 保存 BOM 配置失败：', error);
    return res.status(500).json({ error: '[CRITICAL] 保存 BOM 配置失败。' });
  }
});

// 删除 BOM 中的某个零件
app.delete('/api/bom/:parentId/:componentId', authenticateToken, requirePermission('canAccessAssembly'), async (req: AuthenticatedRequest, res: Response) => {
  const { parentId, componentId } = req.params;
  try {
    await prisma.bomComponent.delete({
      where: {
        parentItemId_componentItemId: {
          parentItemId: parentId,
          componentItemId: componentId
        }
      }
    });
    return res.json({ success: true });
  } catch (error) {
    console.error('[CRITICAL] 删除 BOM 零件失败：', error);
    return res.status(500).json({ error: '[CRITICAL] 删除 BOM 零件失败。' });
  }
});

// ---------------------- 组装操作 API ----------------------

// 检查库存是否可以组装
app.post('/api/assembly/check', authenticateToken, requirePermission('canAccessAssembly'), async (req: AuthenticatedRequest, res: Response) => {
  const { assembledItemId, quantity, warehouseId } = req.body;

  if (!assembledItemId || !quantity || !warehouseId) {
    return res.status(400).json({ error: '[CRITICAL] 缺少必要参数。' });
  }

  try {
    // 获取 BOM 清单
    const bom = await prisma.bomComponent.findMany({
      where: { parentItemId: assembledItemId },
      include: {
        componentItem: true
      }
    });

    if (bom.length === 0) {
      return res.status(400).json({ error: '[CRITICAL] 该成品未配置 BOM 清单，无法组装。' });
    }

    // 检查每个零件的库存
    const stockCheck = [];
    for (const component of bom) {
      const requiredQty = component.quantity * parseInt(quantity);
      
      // 计算仓库中该零件的库存
      const moves = await prisma.goodsMove.findMany({
        where: {
          itemId: component.componentItemId,
          OR: [
            { fromWarehouseId: warehouseId },
            { toWarehouseId: warehouseId }
          ]
        }
      });

      let stock = 0;
      for (const m of moves) {
        if (m.toWarehouseId === warehouseId) stock += m.qty;
        if (m.fromWarehouseId === warehouseId) stock -= m.qty;
      }

      stockCheck.push({
        componentItem: component.componentItem,
        requiredQty,
        currentStock: stock,
        sufficient: stock >= requiredQty
      });
    }

    const allSufficient = stockCheck.every(c => c.sufficient);

    return res.json({
      canAssemble: allSufficient,
      stockCheck
    });
  } catch (error) {
    console.error('[CRITICAL] 库存检查失败：', error);
    return res.status(500).json({ error: '[CRITICAL] 库存检查失败。' });
  }
});

// 执行组装操作
app.post('/api/assembly/assemble', authenticateToken, requirePermission('canAccessAssembly'), async (req: AuthenticatedRequest, res: Response) => {
  const { assembledItemId, quantity, warehouseId, remarks } = req.body;
  const userId = req.user?.id;

  if (!assembledItemId || !quantity || !warehouseId || !userId) {
    return res.status(400).json({ error: '[CRITICAL] 缺少必要参数。' });
  }

  try {
    // 获取 BOM 清单
    const bom = await prisma.bomComponent.findMany({
      where: { parentItemId: assembledItemId },
      include: {
        componentItem: true
      }
    });

    if (bom.length === 0) {
      return res.status(400).json({ error: '[CRITICAL] 该成品未配置 BOM 清单，无法组装。' });
    }

    // 再次检查库存（防止并发问题）
    for (const component of bom) {
      const requiredQty = component.quantity * parseInt(quantity);
      const moves = await prisma.goodsMove.findMany({
        where: {
          itemId: component.componentItemId,
          OR: [
            { fromWarehouseId: warehouseId },
            { toWarehouseId: warehouseId }
          ]
        }
      });

      let stock = 0;
      for (const m of moves) {
        if (m.toWarehouseId === warehouseId) stock += m.qty;
        if (m.fromWarehouseId === warehouseId) stock -= m.qty;
      }

      if (stock < requiredQty) {
        return res.status(400).json({ 
          error: `[CRITICAL] ${component.componentItem.name} 库存不足。需要 ${requiredQty}，库存 ${stock}。` 
        });
      }
    }

    // 计算总成本
    let totalCost = 0;
    for (const component of bom) {
      totalCost += component.componentItem.cost * component.quantity * parseInt(quantity);
    }

    // 在事务中执行组装操作
    const result = await prisma.$transaction(async (tx) => {
      // 1. 创建零件出库流转记录
      const componentMoves = [];
      for (const component of bom) {
        const move = await tx.goodsMove.create({
          data: {
            itemId: component.componentItemId,
            qty: component.quantity * parseInt(quantity),
            type: 'OUT',
            fromWarehouseId: warehouseId,
            userId,
            remarks: `组装消耗：${remarks || ''}`
          },
          include: {
            item: true
          }
        });
        componentMoves.push(move);
      }

      // 2. 创建成品入库流转记录
      const productMove = await tx.goodsMove.create({
        data: {
          itemId: assembledItemId,
          qty: parseInt(quantity),
          type: 'IN',
          toWarehouseId: warehouseId,
          userId,
          remarks: `组装生产：${remarks || ''}`
        },
        include: {
          item: true
        }
      });

      // 3. 创建组装日志
      const assemblyLog = await tx.assemblyLog.create({
        data: {
          type: 'ASSEMBLE',
          assembledItemId,
          quantity: parseInt(quantity),
          totalCost,
          warehouseId,
          userId,
          remarks
        },
        include: {
          assembledItem: true,
          warehouse: true,
          user: { select: { username: true } }
        }
      });

      return { assemblyLog, componentMoves, productMove };
    });

    return res.json(result);
  } catch (error: any) {
    console.error('[CRITICAL] 组装操作失败：', error);
    return res.status(500).json({ error: error.message || '[CRITICAL] 组装操作失败。' });
  }
});

// 执行拆解操作
app.post('/api/assembly/disassemble', authenticateToken, requirePermission('canAccessAssembly'), async (req: AuthenticatedRequest, res: Response) => {
  const { assembledItemId, quantity, warehouseId, remarks } = req.body;
  const userId = req.user?.id;

  if (!assembledItemId || !quantity || !warehouseId || !userId) {
    return res.status(400).json({ error: '[CRITICAL] 缺少必要参数。' });
  }

  try {
    // 获取 BOM 清单
    const bom = await prisma.bomComponent.findMany({
      where: { parentItemId: assembledItemId },
      include: {
        componentItem: true
      }
    });

    if (bom.length === 0) {
      return res.status(400).json({ error: '[CRITICAL] 该成品未配置 BOM 清单，无法拆解。' });
    }

    // 检查成品库存
    const moves = await prisma.goodsMove.findMany({
      where: {
        itemId: assembledItemId,
        OR: [
          { fromWarehouseId: warehouseId },
          { toWarehouseId: warehouseId }
        ]
      }
    });

    let stock = 0;
    for (const m of moves) {
      if (m.toWarehouseId === warehouseId) stock += m.qty;
      if (m.fromWarehouseId === warehouseId) stock -= m.qty;
    }

    if (stock < parseInt(quantity)) {
      return res.status(400).json({ 
        error: `[CRITICAL] 成品库存不足。需要 ${quantity}，库存 ${stock}。` 
      });
    }

    // 计算成本（拆解时记录负成本）
    let totalCost = 0;
    for (const component of bom) {
      totalCost += component.componentItem.cost * component.quantity * parseInt(quantity);
    }

    // 在事务中执行拆解操作
    const result = await prisma.$transaction(async (tx) => {
      // 1. 创建成品出库流转记录
      const productMove = await tx.goodsMove.create({
        data: {
          itemId: assembledItemId,
          qty: parseInt(quantity),
          type: 'OUT',
          fromWarehouseId: warehouseId,
          userId,
          remarks: `拆解消耗：${remarks || ''}`
        },
        include: {
          item: true
        }
      });

      // 2. 创建零件入库流转记录
      const componentMoves = [];
      for (const component of bom) {
        const move = await tx.goodsMove.create({
          data: {
            itemId: component.componentItemId,
            qty: component.quantity * parseInt(quantity),
            type: 'IN',
            toWarehouseId: warehouseId,
            userId,
            remarks: `拆解还原：${remarks || ''}`
          },
          include: {
            item: true
          }
        });
        componentMoves.push(move);
      }

      // 3. 创建拆解日志
      const assemblyLog = await tx.assemblyLog.create({
        data: {
          type: 'DISASSEMBLE',
          assembledItemId,
          quantity: parseInt(quantity),
          totalCost: -totalCost, // 拆解记录负成本
          warehouseId,
          userId,
          remarks
        },
        include: {
          assembledItem: true,
          warehouse: true,
          user: { select: { username: true } }
        }
      });

      return { assemblyLog, componentMoves, productMove };
    });

    return res.json(result);
  } catch (error: any) {
    console.error('[CRITICAL] 拆解操作失败：', error);
    return res.status(500).json({ error: error.message || '[CRITICAL] 拆解操作失败。' });
  }
});

// 获取组装历史记录
app.get('/api/assembly/logs', authenticateToken, requirePermission('canAccessAssembly'), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const logs = await prisma.assemblyLog.findMany({
      include: {
        assembledItem: true,
        warehouse: true,
        user: { select: { username: true } }
      },
      orderBy: { createdAt: 'desc' },
      take: 100 // 最近 100 条记录
    });
    return res.json(logs);
  } catch (error) {
    console.error('[CRITICAL] 获取组装历史失败：', error);
    return res.status(500).json({ error: '[CRITICAL] 获取组装历史失败。' });
  }
});
