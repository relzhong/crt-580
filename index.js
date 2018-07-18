const ffi = require('ffi');
const ref = require('ref');
const path = require('path');
const bsplit = require('buffer-split');
const R = require('ramda');
const Decimal = require('decimal.js');
const hardware = {};

/**
   * 字符串转Hex Buffer
   * @param {String} req 字符 { 0 ~ F }
   * @param {Number} length 长度, 自动补长
   * @param {Number} type 拼接方式 { 0: 右边补0, 1: 左边补0 }
   * @return {Buffer} res
   */
function str2Hex(req, length, type) {
  if (length) {
    if (type) {
      // 左边补0
      if (req.length % 2) {
        req = '0' + req;
      }
      const surplusNum = length * 2 - req.length;
      const surplus = R.reduce(R.concat, '', R.repeat('0', surplusNum));
      req = R.splitEvery(2, surplus + req);

    } else {
      // 默认右边补0
      if (req.length % 2) {
        req = req + '0';
      }
      const surplusNum = length * 2 - req.length;
      const surplus = R.reduce(R.concat, '', R.repeat('0', surplusNum));
      req = R.splitEvery(2, req + surplus);
    }
  } else {
    if (req.length % 2) {
      req = req + '0';
    }
    req = R.splitEvery(2, req);
  }

  let buf = Buffer.from('');
  req.forEach(i => { buf = Buffer.concat([ buf, Buffer.alloc(1, new Decimal('0x' + i).toNumber()) ]); });
  return buf;
}

/**
     * Hex Buffer转字符串
     * @param {Buffer} req 字符
     * @return {String} res
     */
function hex2Str(req) {
  let dec = '';
  for (let i = 0; i < req.length; i++) {
    let d = new Decimal(req.readUIntBE(i, 1)).toHex().slice(2, 4)
      .toUpperCase();
    d = d.length % 2 ? '0' + d : '' + d;
    dec = dec + d;
  }
  return dec;
}

const libcrt = ffi.Library(path.join(__dirname, './lib/CRT_580'), {
  CommOpen: [ 'pointer', [ 'string' ]],
  CommClose: [ 'int', [ 'pointer' ]],
  CRT580_Reset: [ 'int', [ 'pointer', 'int', 'int' ]], // AddrH, Addrl
  CRT580_CardSetting: [ 'int', [ 'pointer', 'int', 'int', 'int', 'int' ]],
  CRT580_GetStatus: [ 'int', [ 'pointer', 'int', 'int', 'pointer', 'pointer', 'pointer', 'pointer', 'pointer', 'pointer' ]],
  CRT580_MoveCard: [ 'int', [ 'pointer', 'int', 'int', 'int', 'int' ]],
  MC_ReadTrack: [ 'int', [ 'pointer', 'int', 'int', 'int', 'int', 'pointer', 'pointer' ]],
  CRT_IC_CardOpen: [ 'int', [ 'pointer', 'int', 'int' ]],
  CRT_IC_CardClose: [ 'int', [ 'pointer', 'int', 'int' ]],
  CPU_Reset: [ 'int', [ 'pointer', 'int', 'int', 'pointer', 'pointer', 'pointer' ]],
  CPU_T0_C_APDU: [ 'int', [ 'pointer', 'int', 'int', 'int', 'string', 'pointer', 'pointer' ]],
  CPU_T1_C_APDU: [ 'int', [ 'pointer', 'int', 'int', 'int', 'string', 'pointer', 'pointer' ]],
});

hardware.CommOpen = port => {
  try {
    const handle = libcrt.CommOpen(port);
    if (ref.isNull(handle)) {
      return { error: -1 };
    }
    return { error: 0, data: { handle } };
  } catch (e) {
    return { error: -1 };
  }
};

hardware.CommClose = handle => {
  try {
    const res = libcrt.CommClose(handle);
    if (res === 0) {
      return { error: 0 };
    }
    return { error: -1 };
  } catch (e) {
    return { error: -1 };
  }
};

hardware.CRT580_Reset = (handle, deviceSerial) => {
  try {
    const res = libcrt.CRT580_Reset(handle, 0x30, deviceSerial);
    if (res === 0) {
      return { error: 0 };
    }
    return { error: -1 };
  } catch (e) {
    return { error: -1 };
  }
};

hardware.CRT580_CardSetting = (handle, deviceSerial, cardIn, stopPosition) => {
  try {
    const res = libcrt.CRT580_CardSetting(handle, 0x30, deviceSerial, cardIn, stopPosition);
    if (res === 0) {
      return { error: 0 };
    }
    return { error: -1 };
  } catch (e) {
    return { error: -1 };
  }
};


hardware.CRT580_GetStatus = (handle, deviceSerial) => {
  try {
    const ss5 = ref.alloc(ref.types.byte);
    const ss4 = ref.alloc(ref.types.byte);
    const ss3 = ref.alloc(ref.types.byte);
    const ss2 = ref.alloc(ref.types.byte);
    const ss1 = ref.alloc(ref.types.byte);
    const ss0 = ref.alloc(ref.types.byte);
    const res = libcrt.CRT580_GetStatus(handle, 0x30, deviceSerial, ss5, ss4, ss3, ss2, ss1, ss0);
    if (res === 0) {
      return { error: 0, data: { ss5: ss5.deref(), ss4: ss4.deref(), ss3: ss3.deref(),
        ss2: ss2.deref(), ss1: ss1.deref(), ss0: ss0.deref() },
      };
    }
    return { error: -1 };
  } catch (e) {
    return { error: -1 };
  }
};

hardware.CRT580_MoveCard = (handle, deviceSerial, toPosition, fromPosition) => {
  try {
    const res = libcrt.CRT580_MoveCard(handle, 0x30, deviceSerial, toPosition, fromPosition);
    if (res === 0) {
      return { error: 0 };
    }
    return { error: -1 };
  } catch (e) {
    return { error: -1 };
  }
};

hardware.MC_ReadTrack = (handle, deviceSerial, track) => {
  try {
    const len = ref.alloc(ref.types.byte);
    const data = ref.alloc(ref.types.char);
    const res = libcrt.MC_ReadTrack(handle, 0x30, deviceSerial, 0x30, track, data, len);
    if (res === 0) {
      let track1;
      let track2;
      let track3;
      const blockData = ref.reinterpret(data, len.deref());
      const blocks = bsplit(blockData, Buffer.from([ 0x1f ])).slice(1);
      if (blocks[0]) {
        track1 = (blocks[0][0] === 0x59) ? blocks[0].slice(1).toString() : undefined;
      }
      if (blocks[1]) {
        track2 = (blocks[1][0] === 0x59) ? blocks[1].slice(1).toString() : undefined;
      }
      if (blocks[2]) {
        track3 = (blocks[2][0] === 0x59) ? blocks[2].slice(1).toString() : undefined;
      }
      return { error: 0, data: { track1, track2, track3 } };
    }
    return { error: -1 };
  } catch (e) {
    return { error: -1 };
  }
};


hardware.CRT_IC_CardOpen = (handle, deviceSerial) => {
  try {
    const res = libcrt.CRT_IC_CardOpen(handle, 0x30, deviceSerial);
    if (res === 0) {
      return { error: 0 };
    }
    return { error: -1 };
  } catch (e) {
    return { error: -1 };
  }
};

hardware.CRT_IC_CardClose = (handle, deviceSerial) => {
  try {
    const res = libcrt.CRT_IC_CardClose(handle, 0x30, deviceSerial);
    if (res === 0) {
      return { error: 0 };
    }
    return { error: -1 };
  } catch (e) {
    return { error: -1 };
  }
};

hardware.CPU_Reset = (handle, deviceSerial) => {
  try {
    const cpuType = ref.alloc(ref.types.byte);
    const len = ref.alloc(ref.types.byte);
    const data = ref.alloc(ref.types.char);
    const res = libcrt.CPU_Reset(handle, 0x30, deviceSerial, cpuType, data, len);
    if (res === 0) {
      return { error: 0, data: { cpuType: cpuType.deref(), exData: ref.reinterpret(data, len.deref()).toString() } };
    }
    console.log(res);
    return { error: -1 };
  } catch (e) {
    return { error: -1 };
  }
};

hardware.CPU_T0_C_APDU = (handle, deviceSerial, apduData) => {
  try {
    const inData = str2Hex(apduData);
    const len = ref.alloc(ref.types.byte);
    const data = ref.alloc(ref.types.char);
    const res = libcrt.CPU_T0_C_APDU(handle, 0x30, deviceSerial, inData.length, inData, data, len);
    const outData = ref.reinterpret(data, len.deref());
    if (res === 0) {
      return { error: 0, data: { exData: hex2Str(outData) } };
    }
    return { error: -1 };
  } catch (e) {
    return { error: -1 };
  }
};

hardware.CPU_T1_C_APDU = (handle, deviceSerial, apduData) => {
  try {
    const inData = str2Hex(apduData);
    const len = ref.alloc(ref.types.byte);
    const data = ref.alloc(ref.types.char);
    const res = libcrt.CPU_T1_C_APDU(handle, 0x30, deviceSerial, inData.length, inData, data, len);
    const outData = ref.reinterpret(data, len.deref());
    if (res === 0) {
      return { error: 0, data: { exData: hex2Str(outData) } };
    }
    return { error: -1 };
  } catch (e) {
    return { error: -1 };
  }
};

module.exports = hardware;
