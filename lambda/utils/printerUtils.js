const iconv = require('iconv-lite');

function sanitizePrinterContent(content) {
  if (!content) {
    return '';
  }

  let text = String(content);

  text = text.replace(/[^\x20-\x7E\u4E00-\u9FA5\u3000-\u303F\uFF00-\uFFEF]/g, '');

  if (text.length > 200) {
    text = `${text.substring(0, 197) }...`;
  }

  return text;
}

function toGBK(text) {
  if (!text) {
    return Buffer.alloc(0);
  }
  const utf8Buffer = Buffer.from(String(text), 'utf8');
  return iconv.encode(iconv.decode(utf8Buffer, 'utf8'), 'gbk');
}

function formatPrinterCommand(commands) {
  const ESC = 0x1B;
  const GS = 0x1D;
  const commandsBuffer = Buffer.alloc(0);

  for (const cmd of commands) {
    if (cmd.type === 'init') {
      commandsBuffer = Buffer.concat([commandsBuffer, Buffer.from([ESC, 0x40])]);
    } else if (cmd.type === 'text') {
      commandsBuffer = Buffer.concat([commandsBuffer, toGBK(sanitizePrinterContent(cmd.content))]);
    } else if (cmd.type === 'line') {
      commandsBuffer = Buffer.concat([commandsBuffer, Buffer.from('\n')]);
    } else if (cmd.type === 'align') {
      const alignMap = { left: 0, center: 1, right: 2 };
      commandsBuffer = Buffer.concat([commandsBuffer, Buffer.from([ESC, 0x61, alignMap[cmd.value] || 0])]);
    } else if (cmd.type === 'bold') {
      commandsBuffer = Buffer.concat([commandsBuffer, Buffer.from([ESC, 0x45, cmd.value ? 1 : 0])]);
    } else if (cmd.type === 'size') {
      const sizeMap = { normal: 0x00, double: 0x11, large: 0x22 };
      commandsBuffer = Buffer.concat([commandsBuffer, Buffer.from([GS, 0x21, sizeMap[cmd.value] || 0])]);
    } else if (cmd.type === 'cut') {
      commandsBuffer = Buffer.concat([commandsBuffer, Buffer.from([GS, 0x56, 0x00])]);
    }
  }

  return commandsBuffer;
}

module.exports = {
  sanitizePrinterContent,
  toGBK,
  formatPrinterCommand
};
