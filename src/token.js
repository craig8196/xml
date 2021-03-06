module.exports.Token = {
  ELEMENT_START_OPEN: 0,
  ELEMENT_END_OPEN: 1,
  DECL_OPEN: 2,
  DECL_CLOSE: 3, // Deprecated, use ELEMENT_CLOSE.
  COMMENT_OPEN: 4,
  COMMENT_CLOSE: 5,
  ELEMENT_CLOSE: 6,
  EMPTY_ELEMENT_CLOSE: 7,
  NAME: 8,
  EQ: 9,
  ATTRIBUTE_VALUE: 10,
  COMMENT_FRAGMENT: 11,
  PI_OPEN: 12,
  PI_CLOSE: 13,
  CHAR_DATA_FRAGMENT: 14,
  CDATA_OPEN: 15,
  CDATA_FRAGMENT: 16,
  CDATA_CLOSE: 17,
};

module.exports.TokenNameLookup = [
  'ELEMENT_START_OPEN',
  'ELEMENT_END_OPEN',
  'DECL_OPEN',
  'DECL_CLOSE',
  'COMMENT_OPEN',
  'COMMENT_CLOSE',
  'ELEMENT_CLOSE',
  'EMPTY_ELEMENT_CLOSE',
  'NAME',
  'EQ',
  'ATTRIBUTE_VALUE',
  'COMMENT_FRAGMENT',
  'PI_OPEN',
  'PI_CLOSE',
  'CHAR_DATA_FRAGMENT',
  'CDATA_OPEN',
  'CDATA_FRAGMENT',
  'CDATA_CLOSE',
];
