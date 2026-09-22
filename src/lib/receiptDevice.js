/*
  MarketBaza
  Universal ESC/POS receipt printer transport

  Qo'llab-quvvatlaydi:
  - WebUSB
  - Web Serial
  - ESC/POS thermal printers
  - 58mm / 80mm printerlar
  - USB printer
  - USB-to-Serial printer

  Muhim:
  Native Windows USB printer drayveri WebUSB'ni bloklashi mumkin.
  Bunday holatda Web Serial yoki local print service kerak bo'ladi.
*/

let usbDevice = null;
let usbInterfaceNumber = null;
let usbEndpointNumber = null;

let serialPort = null;
let serialWriter = null;

let connectionType = null;

/* =========================================================
   BROWSER SUPPORT
========================================================= */

export function isWebUSBSupported() {
  return (
    typeof navigator !== 'undefined' &&
    'usb' in navigator
  );
}

export function isWebSerialSupported() {
  return (
    typeof navigator !== 'undefined' &&
    'serial' in navigator
  );
}

/* =========================================================
   GENERAL STATUS
========================================================= */

export function isReceiptDeviceConnected() {
  if (connectionType === 'usb') {
    return (
      usbDevice !== null &&
      usbDevice.opened === true
    );
  }

  if (connectionType === 'serial') {
    return (
      serialPort !== null &&
      serialPort.readable !== null &&
      serialPort.writable !== null
    );
  }

  return false;
}

/* =========================================================
   FIND USB OUT ENDPOINT
========================================================= */

function findUsbOutputEndpoint(device) {
  if (!device.configuration) {
    throw new Error(
      'USB konfiguratsiyasi topilmadi.'
    );
  }

  for (const iface of device.configuration.interfaces) {
    for (const alternate of iface.alternates) {
      const outEndpoint = alternate.endpoints.find(
        (endpoint) =>
          endpoint.direction === 'out' &&
          (
            endpoint.type === 'bulk' ||
            endpoint.type === 'interrupt'
          )
      );

      if (outEndpoint) {
        return {
          interfaceNumber: iface.interfaceNumber,
          alternateSetting: alternate.alternateSetting,
          endpointNumber: outEndpoint.endpointNumber,
          endpointType: outEndpoint.type,
        };
      }
    }
  }

  throw new Error(
    'Printerning USB OUT endpointi topilmadi.'
  );
}

/* =========================================================
   USB CONNECT
========================================================= */

async function connectUSB() {
  if (!isWebUSBSupported()) {
    throw new Error(
      'Bu brauzer WebUSB ni qo‘llab-quvvatlamaydi.'
    );
  }

  /*
    Filter bermaymiz.

    Shuning uchun Chrome/Edge USB oynasida
    foydalanuvchi o'z chek printerini tanlaydi.
  */

  const device = await navigator.usb.requestDevice({
    filters: [],
  });

  usbDevice = device;

  try {
    await usbDevice.open();
  } catch (error) {
    usbDevice = null;

    throw new Error(
      'USB printerga kirish rad etildi (Access denied). ' +
      'Windows printer drayveri USB qurilmani egallab turgan bo‘lishi mumkin.'
    );
  }

  if (usbDevice.configuration === null) {
    /*
      BUG FIX: konfiguratsiya raqami har doim 1
      bo'lavermaydi. Ba'zi printerlarda birinchi
      mavjud konfiguratsiya qiymati 1 dan farq
      qiladi — shu sabab "Configuration not found"
      xatosi chiqishi mumkin edi. Qurilma o'zi
      e'lon qilgan birinchi konfiguratsiyani olamiz.
    */
    const firstConfig =
      usbDevice.configurations?.[0];

    await usbDevice.selectConfiguration(
      firstConfig?.configurationValue || 1
    );
  }

  const endpoint = findUsbOutputEndpoint(
    usbDevice
  );

  usbInterfaceNumber =
    endpoint.interfaceNumber;

  usbEndpointNumber =
    endpoint.endpointNumber;

  /*
    BUG FIX: WebUSB spetsifikatsiyasiga ko'ra
    selectAlternateInterface() faqat interfeys
    claimInterface() bilan EGALLAB olingandan
    keyin chaqirilishi mumkin. Avvalgi tartibda
    (selectAlternateInterface -> claimInterface)
    alternate setting 0 bo'lmagan printerlarda
    "InvalidStateError: interface not claimed"
    xatosi bilan ulanish butunlay buzilardi.
  */

  try {
    await usbDevice.claimInterface(
      usbInterfaceNumber
    );
  } catch (error) {
    try {
      await usbDevice.close();
    } catch {
      // ignore
    }

    usbDevice = null;
    usbInterfaceNumber = null;
    usbEndpointNumber = null;

    throw new Error(
      'USB printer interfeysini egallab bo‘lmadi. ' +
      'Windows printer drayveri USB interfeysni ishlatayotgan bo‘lishi mumkin.'
    );
  }

  if (endpoint.alternateSetting !== 0) {
    try {
      await usbDevice.selectAlternateInterface(
        usbInterfaceNumber,
        endpoint.alternateSetting
      );
    } catch (error) {
      try {
        await usbDevice.releaseInterface(
          usbInterfaceNumber
        );
        await usbDevice.close();
      } catch {
        // ignore
      }

      usbDevice = null;
      usbInterfaceNumber = null;
      usbEndpointNumber = null;

      throw new Error(
        'USB printerning alternate interfeysini tanlab bo‘lmadi.'
      );
    }
  }

  connectionType = 'usb';

  console.log('USB printer ulandi:', {
    vendorId: usbDevice.vendorId,
    productId: usbDevice.productId,
    productName: usbDevice.productName,
    manufacturerName: usbDevice.manufacturerName,
    serialNumber: usbDevice.serialNumber,
    interfaceNumber: usbInterfaceNumber,
    endpointNumber: usbEndpointNumber,
  });

  return usbDevice;
}

/* =========================================================
   SERIAL CONNECT
========================================================= */

async function connectSerial(baudRate = 9600) {
  if (!isWebSerialSupported()) {
    throw new Error(
      'Bu brauzer Web Serial API ni qo‘llab-quvvatlamaydi.'
    );
  }

  /*
    Portni foydalanuvchi Chrome oynasidan tanlaydi.
  */

  const port = await navigator.serial.requestPort();

  await port.open({
    baudRate: Number(baudRate) || 9600,
    dataBits: 8,
    stopBits: 1,
    parity: 'none',
    flowControl: 'none',
  });

  serialPort = port;

  serialWriter =
    serialPort.writable.getWriter();

  connectionType = 'serial';

  console.log(
    'Serial printer ulandi:',
    serialPort
  );

  return serialPort;
}

/* =========================================================
   MAIN CONNECT
========================================================= */

export async function connectReceiptDevice(
  options = {}
) {
  const {
    baudRate = 9600,
    connection = 'usb',
  } = options;

  /*
    Agar avval ulangan bo'lsa qayta ulash shart emas.
  */

  if (isReceiptDeviceConnected()) {
    return getReceiptDeviceInfo();
  }

  /*
    USB rejimi
  */

  if (
    connection === 'usb' ||
    connection === 'webusb'
  ) {
    return await connectUSB();
  }

  /*
    Serial rejimi
  */

  if (
    connection === 'serial' ||
    connection === 'webserial'
  ) {
    return await connectSerial(baudRate);
  }

  throw new Error(
    'Nomaʼlum printer ulanish turi: ' +
      connection
  );
}

/* =========================================================
   RECONNECT USB
========================================================= */

export async function reconnectReceiptDevice() {
  if (!isWebUSBSupported()) {
    throw new Error(
      'WebUSB qo‘llab-quvvatlanmaydi.'
    );
  }

  const devices =
    await navigator.usb.getDevices();

  if (!devices.length) {
    throw new Error(
      'Oldin ruxsat berilgan USB printer topilmadi.'
    );
  }

  const device = devices[0];

  usbDevice = device;

  await usbDevice.open();

  if (usbDevice.configuration === null) {
    const firstConfig =
      usbDevice.configurations?.[0];

    await usbDevice.selectConfiguration(
      firstConfig?.configurationValue || 1
    );
  }

  const endpoint =
    findUsbOutputEndpoint(usbDevice);

  usbInterfaceNumber =
    endpoint.interfaceNumber;

  usbEndpointNumber =
    endpoint.endpointNumber;

  await usbDevice.claimInterface(
    usbInterfaceNumber
  );

  if (endpoint.alternateSetting !== 0) {
    await usbDevice.selectAlternateInterface(
      usbInterfaceNumber,
      endpoint.alternateSetting
    );
  }

  connectionType = 'usb';

  return usbDevice;
}

/* =========================================================
   USB SEND
========================================================= */

async function sendUSB(data) {
  if (
    !usbDevice ||
    !usbDevice.opened
  ) {
    throw new Error(
      'USB printer ulanmagan.'
    );
  }

  if (
    usbInterfaceNumber === null ||
    usbEndpointNumber === null
  ) {
    throw new Error(
      'USB printer endpointi aniqlanmagan.'
    );
  }

  const bytes =
    data instanceof Uint8Array
      ? data
      : new Uint8Array(data);

  /*
    Juda katta cheklarni bo'lib yuboramiz.
    Bu ayrim printerlarda USB buffer muammosini kamaytiradi.
  */

  const chunkSize = 1024;

  for (
    let offset = 0;
    offset < bytes.length;
    offset += chunkSize
  ) {
    const chunk =
      bytes.slice(
        offset,
        Math.min(
          offset + chunkSize,
          bytes.length
        )
      );

    await usbDevice.transferOut(
      usbEndpointNumber,
      chunk
    );

    /*
      Printerga juda tez yuborib yubormaslik uchun
      kichik kutish.
    */

    await sleep(10);
  }
}

/* =========================================================
   SERIAL SEND
========================================================= */

async function sendSerial(data) {
  if (!serialWriter) {
    throw new Error(
      'Serial printer ulanmagan.'
    );
  }

  const bytes =
    data instanceof Uint8Array
      ? data
      : new Uint8Array(data);

  await serialWriter.write(bytes);
}

/* =========================================================
   SEND RAW ESC/POS
========================================================= */

export async function sendRaw(data) {
  if (connectionType === 'usb') {
    await sendUSB(data);
    return;
  }

  if (connectionType === 'serial') {
    await sendSerial(data);
    return;
  }

  throw new Error(
    'Printer ulanmagan.'
  );
}

/* =========================================================
   DISCONNECT
========================================================= */

export async function disconnectReceiptDevice() {
  /*
    SERIAL
  */

  if (serialWriter) {
    try {
      serialWriter.releaseLock();
    } catch {
      // ignore
    }

    serialWriter = null;
  }

  if (serialPort) {
    try {
      await serialPort.close();
    } catch {
      // ignore
    }

    serialPort = null;
  }

  /*
    USB
  */

  if (usbDevice) {
    try {
      if (
        usbDevice.opened &&
        usbInterfaceNumber !== null
      ) {
        try {
          await usbDevice.releaseInterface(
            usbInterfaceNumber
          );
        } catch {
          // ignore
        }
      }

      if (usbDevice.opened) {
        await usbDevice.close();
      }
    } catch {
      // ignore
    }
  }

  usbDevice = null;
  usbInterfaceNumber = null;
  usbEndpointNumber = null;

  connectionType = null;
}

/* =========================================================
   PRINTER INFO
========================================================= */

export function getReceiptDeviceInfo() {
  if (connectionType === 'usb') {
    if (!usbDevice) {
      return null;
    }

    return {
      type: 'usb',

      productName:
        usbDevice.productName || '',

      manufacturerName:
        usbDevice.manufacturerName || '',

      serialNumber:
        usbDevice.serialNumber || '',

      vendorId:
        usbDevice.vendorId,

      productId:
        usbDevice.productId,

      interfaceNumber:
        usbInterfaceNumber,

      endpointNumber:
        usbEndpointNumber,
    };
  }

  if (connectionType === 'serial') {
    return {
      type: 'serial',

      baudRate:
        serialPort?.getInfo?.() || null,
    };
  }

  return null;
}

/* =========================================================
   ESC/POS COMMANDS
========================================================= */

const ESC = 0x1b;
const GS = 0x1d;
const LF = 0x0a;

const CMD = {
  INIT: new Uint8Array([
    ESC,
    0x40,
  ]),

  ALIGN_LEFT: new Uint8Array([
    ESC,
    0x61,
    0x00,
  ]),

  ALIGN_CENTER: new Uint8Array([
    ESC,
    0x61,
    0x01,
  ]),

  ALIGN_RIGHT: new Uint8Array([
    ESC,
    0x61,
    0x02,
  ]),

  BOLD_ON: new Uint8Array([
    ESC,
    0x45,
    0x01,
  ]),

  BOLD_OFF: new Uint8Array([
    ESC,
    0x45,
    0x00,
  ]),

  DOUBLE_ON: new Uint8Array([
    GS,
    0x21,
    0x11,
  ]),

  NORMAL_SIZE: new Uint8Array([
    GS,
    0x21,
    0x00,
  ]),

  CUT: new Uint8Array([
    GS,
    0x56,
    0x00,
  ]),
};

/* =========================================================
   TEXT ENCODING
========================================================= */

function encodeText(text) {
  /*
    Ko'p POS printerlarda Windows-1251 yoki CP866 kerak
    bo'lishi mumkin.

    Hozir UTF-8 yuboramiz.
    Oddiy lotincha o'zbekcha matnlar uchun ishlaydi.
  */

  return new TextEncoder().encode(
    String(text ?? '')
  );
}

/* =========================================================
   CONCAT BYTES
========================================================= */

function concatBytes(...arrays) {
  const totalLength =
    arrays.reduce(
      (sum, arr) =>
        sum + arr.length,
      0
    );

  const result =
    new Uint8Array(totalLength);

  let offset = 0;

  for (const arr of arrays) {
    result.set(arr, offset);
    offset += arr.length;
  }

  return result;
}

/* =========================================================
   WRITE TEXT
========================================================= */

async function writeText(text) {
  await sendRaw(
    concatBytes(
      encodeText(text),
      new Uint8Array([LF])
    )
  );
}

/* =========================================================
   QR CODE
========================================================= */

function createQRCode(data) {
  const bytes = encodeText(data);

  /*
    Model 2 QR
  */

  const storeLength =
    bytes.length + 3;

  const pL =
    storeLength & 0xff;

  const pH =
    (storeLength >> 8) & 0xff;

  const model =
    new Uint8Array([
      GS,
      0x28,
      0x6b,
      0x04,
      0x00,
      0x31,
      0x41,
      0x32,
      0x00,
    ]);

  /*
    QR size
  */

  const size =
    new Uint8Array([
      GS,
      0x28,
      0x6b,
      0x03,
      0x00,
      0x31,
      0x43,
      0x06,
    ]);

  /*
    Error correction M
  */

  const correction =
    new Uint8Array([
      GS,
      0x28,
      0x6b,
      0x03,
      0x00,
      0x31,
      0x45,
      0x31,
    ]);

  /*
    Store QR data
  */

  const storeHeader =
    new Uint8Array([
      GS,
      0x28,
      0x6b,
      pL,
      pH,
      0x31,
      0x50,
      0x30,
    ]);

  /*
    Print QR
  */

  const print =
    new Uint8Array([
      GS,
      0x28,
      0x6b,
      0x03,
      0x00,
      0x31,
      0x51,
      0x30,
    ]);

  return concatBytes(
    model,
    size,
    correction,
    storeHeader,
    bytes,
    print
  );
}

/* =========================================================
   PRINT RECEIPT
========================================================= */

export async function printReceiptToDevice(
  sale
) {
  if (!isReceiptDeviceConnected()) {
    throw new Error(
      'Avval chek apparatini ulang.'
    );
  }

  const items =
    Array.isArray(sale?.items)
      ? sale.items
      : [];

  const total =
    Number(sale?.total || 0);

  const createdAt =
    sale?.created_at
      ? new Date(sale.created_at)
      : new Date();

  const dateText =
    createdAt.toLocaleString(
      'uz-UZ'
    );

  /*
    QR ichiga oddiy ma'lumot.
  */

  const qrData =
    JSON.stringify({
      total,
      type: sale?.type || 'naqt',
      date: dateText,
    });

  /*
    INIT
  */

  await sendRaw(
    CMD.INIT
  );

  /*
    CENTER
  */

  await sendRaw(
    CMD.ALIGN_CENTER
  );

  await sendRaw(
    CMD.BOLD_ON
  );

  await writeText(
    'MARKETBAZA'
  );

  await sendRaw(
    CMD.BOLD_OFF
  );

  await writeText(
    'CHEK'
  );

  await writeText(
    dateText
  );

  await writeText(
    '------------------------------'
  );

  /*
    LEFT
  */

  await sendRaw(
    CMD.ALIGN_LEFT
  );

  for (const item of items) {
    const name =
      String(
        item?.name || 'Mahsulot'
      );

    const qty =
      Number(
        item?.qty || 0
      );

    const price =
      Number(
        item?.price || 0
      );

    const sum =
      qty * price;

    await writeText(
      name
    );

    await writeText(
      `${qty} x ${formatMoney(price)} = ${formatMoney(sum)}`
    );
  }

  await writeText(
    '------------------------------'
  );

  /*
    TOTAL
  */

  await sendRaw(
    CMD.BOLD_ON
  );

  await sendRaw(
    CMD.DOUBLE_ON
  );

  await writeText(
    `JAMI: ${formatMoney(total)}`
  );

  await sendRaw(
    CMD.NORMAL_SIZE
  );

  await sendRaw(
    CMD.BOLD_OFF
  );

  await writeText(
    `To'lov: ${sale?.type || 'naqt'}`
  );

  /*
    QR
  */

  await sendRaw(
    CMD.ALIGN_CENTER
  );

  await writeText(
    'QR KOD'
  );

  await sendRaw(
    createQRCode(qrData)
  );

  await writeText(
    'Rahmat!'
  );

  /*
    PAPER FEED
  */

  await sendRaw(
    new Uint8Array([
      LF,
      LF,
      LF,
      LF,
    ])
  );

  /*
    CUT
  */

  try {
    await sendRaw(
      CMD.CUT
    );
  } catch {
    /*
      Ba'zi arzon printerlarda
      cutter bo'lmaydi.
    */
  }
}

/* =========================================================
   TEST PRINT
========================================================= */

export async function testReceiptDevice() {
  const sale = {
    items: [
      {
        name: 'Non',
        price: 4000,
        qty: 2,
      },
      {
        name: 'Sut 1L',
        price: 12000,
        qty: 1,
      },
    ],

    total: 20000,

    base_total: 20000,

    negotiated: false,

    type: 'naqt',

    status: 'yopilgan',

    created_at:
      new Date().toISOString(),
  };

  await printReceiptToDevice(
    sale
  );
}

/* =========================================================
   FORMAT MONEY
========================================================= */

function formatMoney(value) {
  return Number(
    value || 0
  ).toLocaleString(
    'uz-UZ'
  ) + ' so‘m';
}

/* =========================================================
   SLEEP
========================================================= */

function sleep(ms) {
  return new Promise(
    (resolve) =>
      setTimeout(resolve, ms)
  );
}

/* =========================================================
   USB DISCONNECT EVENT
========================================================= */

if (
  typeof navigator !== 'undefined' &&
  navigator.usb
) {
  navigator.usb.addEventListener(
    'disconnect',
    (event) => {
      if (
        usbDevice &&
        event.device === usbDevice
      ) {
        usbDevice = null;
        usbInterfaceNumber = null;
        usbEndpointNumber = null;
        connectionType = null;

        console.log(
          'USB printer uzildi.'
        );
      }
    }
  );
}

/* =========================================================
   SERIAL DISCONNECT EVENT
========================================================= */

if (
  typeof navigator !== 'undefined' &&
  navigator.serial
) {
  navigator.serial.addEventListener(
    'disconnect',
    (event) => {
      if (
        serialPort &&
        event.target === serialPort
      ) {
        serialPort = null;
        serialWriter = null;
        connectionType = null;

        console.log(
          'Serial printer uzildi.'
        );
      }
    }
  );
}