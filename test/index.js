const assert = require('assert');

const crt = require('../index');

describe('test com port connect', () => {
  let device;
  it('should open COM3 successfully', () => {
    const { error, data } = crt.CommOpen('COM3');
    assert(error === 0);
    device = data.handle;
  });
  it('should get error successfully', () => {
    let res = crt.CRT580_Reset(device, 0x30);
    assert(res.error === 0);
    res = crt.CRT580_CardSetting(device, 0x30, 0x31, 0x32);
    assert(res.error === 0);
  });
  after(() => {
    crt.CommClose(device);
  });
});

describe('send card to track read', () => {
  let device;
  it('should open COM3 successfully', () => {
    const { error, data } = crt.CommOpen('COM3');
    assert(error === 0);
    device = data.handle;
  });
  it('should send card position to ic positon', () => {
    const res = crt.CRT580_MoveCard(device, 0x30, 0x32, 0x30);
    assert(res.error === 0);
  });
  after(() => {
    crt.CommClose(device);
  });
});

describe('test mc track read', () => {
  let device;
  it('should open COM3 successfully', () => {
    const { error, data } = crt.CommOpen('COM3');
    assert(error === 0);
    device = data.handle;
  });
  it('should read track successfully', () => {
    const res = crt.MC_ReadTrack(device, 0x30, 0x37);
    assert(res.error === 0);
  });
  it('should read track2 successfully', () => {
    const res = crt.MC_ReadTrack(device, 0x30, 0x37);
    assert(res.data.track2);
  });
  after(() => {
    crt.CommClose(device);
  });
});

describe('test ic card read', () => {
  let device;
  it('should open COM3 successfully', () => {
    const { error, data } = crt.CommOpen('COM3');
    assert(error === 0);
    device = data.handle;
  });
  it('should send card position to ic positon', () => {
    const res = crt.CRT580_MoveCard(device, 0x30, 0x32, 0x31);
    assert(res.error === 0);
  });
  it('should open ic card', () => {
    const res = crt.CRT_IC_CardOpen(device, 0x30);
    assert(res.error === 0);
  });
  it('should reset ic card', () => {
    const res = crt.CPU_Reset(device, 0x30);
    assert(res.error === 0);
  });
  it('should exec apdu in type 0 card', () => {
    const res = crt.CPU_T0_C_APDU(device, 0x30, '00A404000E315041592E5359532E4444463031');
    assert(res.error === 0);
  });
  it('should exec apdu successfully', () => {
    const res = crt.CPU_T0_C_APDU(device, 0x30, '00A404000E315041592E5359532E4444463031');
    assert(res.data.exData.slice(-4) === '9000');
  });
  after(() => {
    crt.CommClose(device);
  });
});

describe('send card to receiver', () => {
  let device;
  it('should open COM3 successfully', () => {
    const { error, data } = crt.CommOpen('COM3');
    assert(error === 0);
    device = data.handle;
  });
  it('should send card position to receiver', () => {
    const res = crt.CRT580_MoveCard(device, 0x30, 0x35, 0x31);
    assert(res.error === 0);
  });
  after(() => {
    crt.CommClose(device);
  });
});
