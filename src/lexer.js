var util = require('util');
var Transform = require('stream').Transform;

var Token = require('./token.js').Token;
var TokenNameLookup = require('./token.js').TokenNameLookup;
var CharType = require('./char-type.js');

var State = {
  IN_CONTENT: 10,
  IN_CONTENT_R_BRACKET: 11,
  IN_CONTENT_R_BRACKET_R_BRACKET: 12,

  LEFT_ANGLE: 20,
  LEFT_ANGLE_EXCL: 24,
  LEFT_ANGLE_EXCL_DASH: 25,
  EMPTY_ELEMENT_CLOSE: 26,
  PI_CLOSE: 27,

  IN_ELEMENT: 30,
  VALUE_D_QUOTE: 31,
  VALUE_S_QUOTE: 32,

  IN_COMMENT: 40,
  IN_COMMENT_DASH: 41,
  IN_COMMENT_DASH_DASH: 42,

  NAME: 50,

  IN_CDATA: 60,
  CDATA_L_BRACKET: 61,
  CDATA_L_BRACKET_C: 62,
  CDATA_L_BRACKET_CD: 63,
  CDATA_L_BRACKET_CDA: 64,
  CDATA_L_BRACKET_CDAT: 65,
  CDATA_L_BRACKET_CDATA: 66,
  IN_CDATA_R_BRACKET: 67,
  IN_CDATA_R_BRACKET_R_BRACKET: 68,
};
State.doesStateTrackString = function (state) {
  return state === State.IN_CDATA ||
    state === State.IN_COMMENT ||
    state === State.IN_CONTENT ||
    state === State.NAME ||
    state === State.VALUE_D_QUOTE ||
    state === State.VALUE_S_QUOTE;
};

function Lexer (options) {
  if(!(this instanceof Lexer)) {
    return new Lexer(options);
  }
  Transform.call(this, options);
  this.setDefaultEncoding('utf8');
  this._currentState = State.IN_CONTENT;
  this._startIndex = 0;
  this._chunk = '';
  this._savedChunk = null;
}
util.inherits(Lexer, Transform);

function _emitToken(token, endIndex) {
  if (endIndex === undefined) {
    this.push(TokenNameLookup[token]);
    this.push('\n');
  } else {
    if (this._startIndex <= endIndex && (this._savedChunk !== null || this._startIndex !== endIndex)) {
      this.push(TokenNameLookup[token]);
      this.push(': ');
      if (this._savedChunk !== null) {
        this.push(this._savedChunk);
      }
      this.push(this._chunk.substring(this._startIndex, endIndex));
      this.push('\n');
    }
  }
}

function _startStringTracking(index) {
  this._startIndex = index;
}

/**
 * Used to clean up during the flush operation. Only fragments can be flushed.
 * Partial names or values are not supported as it yields inaccurate
 * information.
 */
function _emitTokenByState() {
  switch (this._currentState) {
    case State.IN_CONTENT:
      this._emitToken(Token.CHAR_DATA_FRAGMENT, this._startIndex);
      break;
    case State.IN_COMMENT:
      this._emitToken(Token.COMMENT_FRAGMENT, this._startIndex);
      break;
    case State.IN_CDATA:
      this._emitToken(Token.CDATA_FRAGMENT, this._startIndex);
      break;
  }
}

/**
 * @see https://nodejs.org/api/stream.html#stream_class_stream_transform
 */
function _transform(chunk, encoding, callback) {
  this._chunk = chunk.toString('utf8');
  var length = chunk.length;
  var chunkIndex = 0;
  this._startStringTracking(chunkIndex);
  // Tokenize
  for (; chunkIndex < length; chunkIndex++) {
    var currentChar = this._chunk[chunkIndex];
    console.log(this._currentState);
    switch (this._currentState) {

      /**
       * Start assuming little context.
       * Content can be almost anything.
       */
      case State.IN_CONTENT:
        if (currentChar === '<') {
          this._emitToken(Token.CHAR_DATA_FRAGMENT, chunkIndex);
          this._currentState = State.LEFT_ANGLE;
        } else if (currentChar === '&') {
          break; // TODO handle references
        } else {
          if (currentChar === ']') { // Might be start of invalid sequence?
            this._emitToken(Token.CHAR_DATA_FRAGMENT, chunkIndex);
            this._currentState = State.IN_CONTENT_R_BRACKET;
            this._startStringTracking(chunkIndex);
          } else { // None exiting char, keep current state
            break;
          }
        }
        break;
      case State.IN_CONTENT_R_BRACKET:
        if (currentChar === ']') {
          this._currentState = State.IN_CONTENT_R_BRACKET_R_BRACKET;
        } else {
          this._currentState = State.IN_CONTENT;
        }
        break;
      case State.IN_CONTENT_R_BRACKET_R_BRACKET:
        if (currentChar === '>') {
          throw new Error('Encountered illegal sequence "]]>".');
        } else {
          this._currentState = State.IN_CONTENT;
          chunkIndex--; // Push back the char to account for "<".
        }
        break;

      /**
       * States handling tag openings like: <, <?, <!--, </
       */
      case State.LEFT_ANGLE:
        if (currentChar === '?') {
          this._emitToken(Token.PI_OPEN);
          this._currentState = State.IN_ELEMENT;
        } else if (currentChar === '!') {
          this._currentState = State.LEFT_ANGLE_EXCL;
        } else if (CharType.isNameStartChar(currentChar)) {
          this._emitToken(Token.ELEMENT_START_OPEN);
          this._currentState = State.NAME;
          this._startStringTracking(chunkIndex);
        } else if (currentChar === '/') {
          this._emitToken(Token.ELEMENT_END_OPEN);
          this._currentState = State.IN_ELEMENT;
        } else {
          throw new Error('Unexpected character "' + currentChar + '".');
        }
        break;
      case State.LEFT_ANGLE_EXCL:
        if (currentChar === '-') {
          this._currentState = State.LEFT_ANGLE_EXCL_DASH;
        } else if (CharType.isNameStartChar(currentChar)) {
          this._emitToken(Token.DECL_OPEN);
          this._currentState = State.NAME;
          this._startStringTracking(chunkIndex);
        } else {
          throw new Error('Expected "-".');
        }
        break;
      case State.LEFT_ANGLE_EXCL_DASH:
        if (currentChar === '-') {
          this._emitToken(Token.COMMENT_OPEN);
          this._currentState = State.IN_COMMENT;
          this._startStringTracking(chunkIndex + 1);
        } else {
          throw new Error('Expected "-".');
        }
        break;

      /**
       * Start emitting tokens in element.
       */
      case State.IN_ELEMENT:
        if (CharType.isWhiteSpace(currentChar)) {
          break;
        } else if (CharType.isNameStartChar(currentChar)) {
          this._currentState = State.NAME;
          this._startStringTracking(chunkIndex);
        } else if (currentChar === '=') {
          this._emitToken(Token.EQ);
        } else if (currentChar === '"') {
          this._currentState = State.VALUE_D_QUOTE;
          this._startStringTracking(chunkIndex + 1);
        } else if (currentChar === '\'') {
          this._currentState = State.VALUE_S_QUOTE;
          this._startStringTracking(chunkIndex + 1);
        } else if (currentChar === '>') {
          this._emitToken(Token.ELEMENT_CLOSE);
          this._currentState = State.IN_CONTENT;
          this._startStringTracking(chunkIndex + 1);
        } else if (currentChar === '/') {
          this._currentState = State.EMPTY_ELEMENT_CLOSE;
        } else if (currentChar === '?') {
          this._currentState = State.PI_CLOSE;
        } else if (currentChar === '[') {
          this._currentState = State.CDATA_L_BRACKET;
        } else {
          throw new Error('Invalid character "' + currentChar + '" in element start.');
        }
        break;
      case State.VALUE_D_QUOTE:
        if (currentChar === '"') {
          this._emitToken(Token.ATTRIBUTE_VALUE, chunkIndex);
          this._currentState = State.IN_ELEMENT;
        } else if (currentChar === '&') {
          break; // TODO handle reference
        } else if (currentChar === '<') {
          throw new Error('Illegal character "<" found in attribute value.');
        } else {
          break; // Any other character is valid.
        }
        break;
      case State.VALUE_S_QUOTE:
        if (currentChar === '\'') {
          this._emitToken(Token.ATTRIBUTE_VALUE, chunkIndex);
          this._currentState = State.IN_ELEMENT;
        } else if (currentChar === '&') {
          break; // TODO handle reference
        } else if (currentChar === '<') {
          throw new Error('Illegal character "<" found in attribute value.');
        } else {
          break; // Any other character is valid.
        }
        break;

      /**
       * Handle comment tokenization.
       */
      case State.IN_COMMENT:
        if (currentChar === '-') {
          this._emitToken(Token.COMMENT_FRAGMENT, chunkIndex);
          this._currentState = State.IN_COMMENT_DASH;
          this._startStringTracking(chunkIndex);
        } else {
          break;
        }
        break;
      case State.IN_COMMENT_DASH:
        if (currentChar === '-') {
          this._currentState = State.IN_COMMENT_DASH_DASH;
        } else {
          this._currentState = State.IN_COMMENT;
        }
        break;
      case State.IN_COMMENT_DASH_DASH:
        if (currentChar === '>') {
          this._emitToken(Token.COMMENT_CLOSE);
          this._currentState = State.IN_CONTENT;
          this._startStringTracking(chunkIndex + 1);
        } else {
          throw new Error('Expected ">", got "' + currentChar + '"');
        }
        break;

      /**
       * Handle empty element and PI tag closing.
       */
      case State.EMPTY_ELEMENT_CLOSE:
        if (currentChar === '>') {
          this._emitToken(Token.EMPTY_ELEMENT_CLOSE);
          this._currentState = State.IN_CONTENT;
          this._startStringTracking(chunkIndex + 1);
        } else {
          throw new Error('Expecting ">".');
        }
        break;
      case State.PI_CLOSE:
        if (currentChar === '>') {
          this._emitToken(Token.PI_CLOSE);
          this._currentState = State.IN_CONTENT;
          this._startStringTracking(chunkIndex + 1);
        } else {
          throw new Error('Expecting ">".');
        }
        break;

      /**
       * Parse names. Even though element and attribute names are the same, they
       * differ in where they are located.
       */
      case State.NAME:
        if (CharType.isNameChar(currentChar)) {
          break;
        } else {
          this._emitToken(Token.NAME, chunkIndex);
          this._currentState = State.IN_ELEMENT;
          chunkIndex--; // Reprocess token
        }
        break;

      /**
       * Chunk CDATA sections.
       */
      case State.CDATA_L_BRACKET:
        if (currentChar === 'C') {
          this._currentState = State.CDATA_L_BRACKET_C;
        } else {
          throw new Error('Expected "C".');
        }
        break;
      case State.CDATA_L_BRACKET_C:
        if (currentChar === 'D') {
          this._currentState = State.CDATA_L_BRACKET_CD;
        } else {
          throw new Error('Expected "D".');
        }
        break;
      case State.CDATA_L_BRACKET_CD:
        if (currentChar === 'A') {
          this._currentState = State.CDATA_L_BRACKET_CDA;
        } else {
          throw new Error('Expected "A".');
        }
        break;
      case State.CDATA_L_BRACKET_CDA:
        if (currentChar === 'T') {
          this._currentState = State.CDATA_L_BRACKET_CDAT;
        } else {
          throw new Error('Expected "T".');
        }
        break;
      case State.CDATA_L_BRACKET_CDAT:
        if (currentChar === 'A') {
          this._currentState = State.CDATA_L_BRACKET_CDATA;
        } else {
          throw new Error('Expected "A".');
        }
        break;
      case State.CDATA_L_BRACKET_CDATA:
        if (currentChar === '[') {
          this._currentState = State.IN_CDATA;
          this._startStringTracking(chunkIndex + 1);
        } else {
          throw new Error('Expected "[".');
        }
        break;
      case State.IN_CDATA:
        if (currentChar === ']') {
          this._emitToken(Token.CDATA_FRAGMENT);
          this._currentState = State.IN_CDATA_R_BRACKET;
          this._startStringTracking(chunkIndex);
        } else {
          break;
        }
        break;
      case State.IN_CDATA_R_BRACKET:
        if (currentChar === ']') {
          this._currentState = State.IN_CDATA_R_BRACKET_R_BRACKET;
        } else {
          this._currentState = State.IN_CDATA;
        }
        break;
      case State.IN_CDATA_R_BRACKET_R_BRACKET:
        if (currentChar === ']') {
          break;
        } else if (currentChar === '>') {
          this._emitToken(Token.CDATA_FRAGMENT, chunkIndex - 2);
          this._emitToken(Token.CDATA_CLOSE);
          this._currentState = State.IN_CONTENT;
        } else {
          this._currentState = State.IN_CDATA;
        }
        break;

      /**
       * Throw error for unknown states.
       */
      default:
        throw new Error('State "' + this._currentState + '" is not handled.');
    }
  }

  // Save current string
  if (State.doesStateTrackString(this._currentState)) {
    if (this._savedChunk === null) {
      this._savedChunk = this._chunk.substring(this._startIndex, chunkIndex);
    } else {
      this._savedChunk = this._savedChunk + this._chunk.substring(this._startIndex, chunkIndex);
    }
  }

  callback();
}

/**
 * @see https://nodejs.org/api/stream.html#stream_class_stream_transform
 */
function _flush(callback) {
  this._emitTokenByState();
  callback();
}

Lexer.prototype._emitToken = _emitToken;
Lexer.prototype._emitTokenByState = _emitTokenByState;
Lexer.prototype._startStringTracking = _startStringTracking;
Lexer.prototype._transform = _transform;
Lexer.prototype._flush = _flush;
module.exports = Lexer;
