import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { useEstimateStore } from '../src/store/estimate-store.js';

describe('Budget History & Persistence', () => {
  test('logHistoryEntry y saveEstimateToDb están definidos en el store', () => {
    const store = useEstimateStore.getState();
    assert.strictEqual(typeof store.saveEstimateToDb, 'function');
    assert.strictEqual(typeof store.logHistoryEntry, 'function');
  });

  test('Presupuesto mantiene flag isDirty al agregar filas hasta llamar markResultPersisted', () => {
    useEstimateStore.setState({
      result: {
        lineItems: [],
        subtotalMaterials: 0,
        subtotalLabor: 0,
        subtotalEngineering: 0,
        subtotalDirect: 0,
        subtotalIndirects: 0,
        grandTotal: 0,
        iva: 0,
        totalWithIva: 0,
      },
      savedResult: null,
      isDirty: false,
    });

    useEstimateStore.getState().addLineItem({
      system: 'CCTV',
      code: 'CAM-001',
      description: 'Cámara Domo IP 4MP',
      category: 'Equipo',
      unit: 'pza',
      quantity: 2,
      unitCost: 1500,
    });

    const stateAfterAdd = useEstimateStore.getState();
    assert.strictEqual(stateAfterAdd.isDirty, true);
    assert.strictEqual(stateAfterAdd.result?.lineItems.length, 1);
    assert.strictEqual(stateAfterAdd.result?.lineItems[0].partida, '5.7.3.01');

    // Marcar como persistido
    useEstimateStore.getState().markResultPersisted();
    const stateAfterSave = useEstimateStore.getState();
    assert.strictEqual(stateAfterSave.isDirty, false);
    assert.notStrictEqual(stateAfterSave.savedResult, null);
  });

  test('restoreHistoryVersion restaura correctamente el snapshot de partidas y totales', () => {
    const snapshotObj = {
      lineItems: [
        {
          id: 'li_test_1',
          partida: '5.7.3.01',
          code: 'CAM-RESTORE-01',
          description: 'Cámara Restaurada 4K',
          category: 'Equipo',
          unit: 'pza',
          quantity: 5,
          unitCost: 2000,
          total: 10000,
          system: 'CCTV',
        },
      ],
      subtotalMaterials: 10000,
      subtotalLabor: 0,
      subtotalEngineering: 0,
      subtotalDirect: 10000,
      subtotalIndirects: 1200,
      grandTotal: 11200,
      iva: 1792,
      totalWithIva: 12992,
    };

    const resOk = useEstimateStore.getState().restoreHistoryVersion(JSON.stringify(snapshotObj));
    assert.strictEqual(resOk, true);

    const state = useEstimateStore.getState();
    assert.strictEqual(state.result?.lineItems.length, 1);
    assert.strictEqual(state.result?.lineItems[0].code, 'CAM-RESTORE-01');
    assert.strictEqual(state.result?.grandTotal, 11200);
    assert.strictEqual(state.isDirty, true);

    // Snapshot inválido o vacío retorna false
    const resBad = useEstimateStore.getState().restoreHistoryVersion('{}');
    assert.strictEqual(resBad, false);
  });
});
