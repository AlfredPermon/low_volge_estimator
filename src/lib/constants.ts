export const SYSTEMS = [
  'CCTV',
  'ACCESO',
  'VOCEO',
  'INCENDIO',
  'CANALIZACION',
  'CABLEADO',
  'GENERAL',
] as const;

export type SystemType = typeof SYSTEMS[number];

export const CATEGORIES = [
  'Equipo',
  'Accesorio',
  'Consumible',
  'Mano de Obra',
  'Servicio',
] as const;

export type CategoryType = typeof CATEGORIES[number];

export const DEVICE_TYPES = [
  // CCTV
  'cctv_camera_bullet',
  'cctv_camera_domo',
  'cctv_camera_ptz',
  'cctv_camera_fisheye',
  'cctv_camera_panoramic',
  'cctv_nvr',
  'cctv_disk',
  'cctv_license',
  // RED / ENERGÍA / RACK (GENERAL)
  'network_switch',
  'ups',
  'rack',
  'monitor',
  'pdu',
  // ACCESO
  'access_reader',
  'access_controller',
  'access_turnstile',
  'access_magnetic_lock',
  'access_exit_button',
  'access_touchless_button',
  'access_software',
  // VOCEO
  'paging_speaker_exterior',
  'paging_speaker_colgante',
  'paging_speaker_ip',
  'paging_speaker_bluetooth',
  'paging_amplifier',
  'paging_gateway',
  // INCENDIO
  'fire_smoke_detector',
  'fire_heat_detector',
  'fire_manual_station',
  'fire_strobe',
  'fire_horn_strobe',
  'fire_co_detector',
  'fire_panel',
  'fire_annunciator',
  // CABLEADO
  'cable_utp',
  'cable_utp_spool',
  'cable_fplr',
  'cable_speaker',
  'network_jack',
  'faceplate',
  'blank_insert',
  'velcro',
  'patch_panel',
  'patch_cord',
  // GESTIÓN DE CABLEADO / RACK
  'cable_management_horizontal',
  'cable_management_vertical',
  // SERVICIOS
  'service_certification',
  'service_labeling',
  'service_as_built',
  'service_install_cabling',
  'service_install_cctv',
  'miscellaneous',
  'conduit_lot',
  // CANALIZACION
  'conduit',
  'codo',
  'cople',
  'conector',
  'soporte',
  'caja',
  'tapa',
  'flexible_plica',
  // MANO DE OBRA
  'labor_cctv',
  'labor_access',
  'labor_paging',
  'labor_fire',
] as const;

export type DeviceType = typeof DEVICE_TYPES[number];

export const DEVICE_TYPE_LABELS: Record<DeviceType, string> = {
  // CCTV
  cctv_camera_bullet: 'Cámara Bullet',
  cctv_camera_domo: 'Cámara Domo',
  cctv_camera_ptz: 'Cámara PTZ',
  cctv_camera_fisheye: 'Cámara Fisheye',
  cctv_camera_panoramic: 'Cámara Panorámica',
  cctv_nvr: 'NVR / Grabador',
  cctv_disk: 'Disco Duro (CCTV)',
  cctv_license: 'Licencia de Cámara (CCTV)',
  // RED / ENERGÍA / RACK (GENERAL)
  network_switch: 'Switch de Red',
  ups: 'UPS',
  rack: 'Rack',
  monitor: 'Monitor / Pantalla',
  pdu: 'PDU (Rack)',
  // ACCESO
  access_reader: 'Lectora / Terminal (Acceso)',
  access_controller: 'Controlador (Acceso)',
  access_turnstile: 'Torniquete (Acceso)',
  access_magnetic_lock: 'Cerradura Magnética',
  access_exit_button: 'Botón de Salida',
  access_touchless_button: 'Botón Sin Contacto (Touchless)',
  access_software: 'Licencia de Software (Acceso)',
  // VOCEO
  paging_speaker_exterior: 'Altavoz Exterior',
  paging_speaker_colgante: 'Altavoz Colgante',
  paging_speaker_ip: 'Altavoz IP',
  paging_speaker_bluetooth: 'Altavoz Bluetooth',
  paging_amplifier: 'Amplificador',
  paging_gateway: 'Gateway VoIP',
  // INCENDIO
  fire_smoke_detector: 'Detector de Humo',
  fire_heat_detector: 'Detector de Temperatura',
  fire_manual_station: 'Estación Manual',
  fire_strobe: 'Estrobo',
  fire_horn_strobe: 'Estrobo con Sirena',
  fire_co_detector: 'Detector de Monóxido (CO)',
  fire_panel: 'Panel de Incendio',
  fire_annunciator: 'Anunciador Remoto',
  // CABLEADO
  cable_utp: 'Cable UTP',
  cable_utp_spool: 'Bobina/Caja UTP (305m)',
  cable_fplr: 'Cable FPLR (Incendio)',
  cable_speaker: 'Cable para Altavoz',
  network_jack: 'Jack RJ45',
  faceplate: 'Placa / Faceplate',
  blank_insert: 'Inserto Ciego',
  velcro: 'Cinta Velcro',
  patch_panel: 'Patch Panel',
  patch_cord: 'Patch Cord',
  // GESTIÓN DE CABLEADO / RACK
  cable_management_horizontal: 'Organizador Horizontal',
  cable_management_vertical: 'Organizador Vertical',
  // SERVICIOS
  service_certification: 'Servicio - Certificación',
  service_labeling: 'Servicio - Etiquetado',
  service_as_built: 'Servicio - As-Built',
  service_install_cabling: 'Servicio - Instalación Cableado',
  service_install_cctv: 'Servicio - Instalación/Config CCTV',
  miscellaneous: 'Misceláneos (Lote)',
  conduit_lot: 'Canalización (Lote)',
  // CANALIZACION
  conduit: 'Tubo Conduit',
  codo: 'Codo Conduit',
  cople: 'Cople Conduit',
  conector: 'Conector Conduit',
  soporte: 'Soporte',
  caja: 'Caja',
  tapa: 'Tapa',
  flexible_plica: 'Flexible Plica',
  // MANO DE OBRA
  labor_cctv: 'Mano de Obra - CCTV',
  labor_access: 'Mano de Obra - Acceso',
  labor_paging: 'Mano de Obra - Voceo',
  labor_fire: 'Mano de Obra - Incendio',
};
