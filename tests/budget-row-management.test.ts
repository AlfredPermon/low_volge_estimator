import { test, describe } from 'node:test';
import assert from 'node:assert';
import { useEstimateStore } from '../src/store/estimate-store';

describe('Budget Row Management & Auto-Recalculation', () => {
  test('addLineItem agrega una nueva partida, asigna partida consecutiva y recalcula subtotales', () => {
    const store = useEstimateStore.getState();

    // Simular un resultado inicial vacio
    store.setResult({
      lineItems: [
        {
          id: 'li_cctv_1',
          partida: '5.7.3.01',
          code: 'CCTV-CAM-001',
          description: 'Cámara IP Bullet 5MP',
          unit: 'pza',
          quantity: 2,
          unitCost: 1000,
          total: 2000,
          system: 'CCTV',
          category: 'Equipo',
        },
      ],
      subtotalMaterials: 2000,
      subtotalLabor: 0,
      subtotalEngineering: 0,
      subtotalDirect: 2000,
      subtotalIndirects: 240,
      subtotalUtility: 336,
      grandTotal: 2576,
      iva: 412.16,
      totalWithIva: 2988.16,
    });

    // Agregar segundo item a CCTV
    useEstimateStore.getState().addLineItem({
      system: 'CCTV',
      code: 'CCTV-CAM-002',
      description: 'Cámara IP Domo 5MP',
      unit: 'pza',
      quantity: 3,
      unitCost: 1500,
      category: 'Equipo',
    });

    const updatedResult = useEstimateStore.getState().result!;
    assert.strictEqual(updatedResult.lineItems.length, 2);

    // Verificar numeración consecutiva del campo Partida
    assert.strictEqual(updatedResult.lineItems[0].partida, '5.7.3.01');
    assert.strictEqual(updatedResult.lineItems[1].partida, '5.7.3.02');

    // Subtotal directo debe ser 2000 + 4500 = 6500
    assert.strictEqual(updatedResult.subtotalDirect, 6500);
    assert.strictEqual(useEstimateStore.getState().isDirty, true);
  });

  test('removeLineItem elimina una partida y renumera partidas consecuentemente', () => {
    const store = useEstimateStore.getState();

    store.setResult({
      lineItems: [
        {
          id: 'li_acc_1',
          partida: '5.7.4.01',
          code: 'ACC-TER-001',
          description: 'Terminal Biométrica',
          unit: 'pza',
          quantity: 1,
          unitCost: 3000,
          total: 3000,
          system: 'ACCESO',
          category: 'Equipo',
        },
        {
          id: 'li_acc_2',
          partida: '5.7.4.02',
          code: 'ACC-TER-002',
          description: 'Lector RFID',
          unit: 'pza',
          quantity: 2,
          unitCost: 1000,
          total: 2000,
          system: 'ACCESO',
          category: 'Equipo',
        },
        {
          id: 'li_acc_3',
          partida: '5.7.4.03',
          code: 'ACC-BOT-001',
          description: 'Boton No Touch',
          unit: 'pza',
          quantity: 4,
          unitCost: 500,
          total: 2000,
          system: 'ACCESO',
          category: 'Equipo',
        },
      ],
      subtotalMaterials: 7000,
      subtotalLabor: 0,
      subtotalEngineering: 0,
      subtotalDirect: 7000,
      subtotalIndirects: 840,
      subtotalUtility: 1176,
      grandTotal: 9016,
      iva: 1442.56,
      totalWithIva: 10458.56,
    });

    // Eliminar el item intermedio li_acc_2
    useEstimateStore.getState().removeLineItem('li_acc_2');

    const updatedResult = useEstimateStore.getState().result!;
    assert.strictEqual(updatedResult.lineItems.length, 2);

    // Las partidas deben renumerarse consecuentemente
    assert.strictEqual(updatedResult.lineItems[0].partida, '5.7.4.01');
    assert.strictEqual(updatedResult.lineItems[1].partida, '5.7.4.02');
    assert.strictEqual(updatedResult.lineItems[1].code, 'ACC-BOT-001');

    // Subtotal directo recargado: 3000 + 2000 = 5000
    assert.strictEqual(updatedResult.subtotalDirect, 5000);
  });
});
