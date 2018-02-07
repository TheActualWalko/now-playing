const WavDecoder = require("wav-decoder");
const fs = require("mz/fs");

const since = ( time )=>{
  return ( ( new Date().getTime() - time ) / 1000 ).toFixed(2);
};

const RIFF_HEX = 0x52494646; // "RIFF"
const WAVE_HEX = 0x57415645; // "WAVE"
const FMT_HEX  = 0x666d7420; // "fmt "
const DATA_HEX = 0x64617461; // "data"

const PCM_SIZE = 16;
const PCM_FORMAT_CODE = 1;

class WavReader{
  static read( filename, optimizationFactor = 1 ){
    console.log(`Reading file: "${filename}".`);
    let readStart = new Date().getTime();
    let decodeStart;
    return fs
      .readFile( filename )
      .then( data => {
        const numChannels = data.readUInt16LE( 22 );
        const bitDepth = data.readUInt16LE( 34 );

        const header = data.slice( 0, 44 ); // WAV headers are 44 bytes long
        const audioData = data.slice( 44 );

        const audioDataMinified = WavReader.minifyBuffer(
          audioData,
          optimizationFactor,
          numChannels * bitDepth / 8
        );
        const minifiedAudioDataLength = audioDataMinified.length;
        const wavFileSizeHeader = (minifiedAudioDataLength) + 36;
        const wavDataSizeHeader = minifiedAudioDataLength;
        const sampleRate = 44100;
        const byteRate = 44100 * numChannels * bitDepth / 8;

        // Below we write out a valid WAV header!
        // see http://soundfile.sapp.org/doc/WaveFormat/ for more info!

        // RIFF chunk descriptor
        header.writeUInt32BE( RIFF_HEX,           0 );
        header.writeUInt32LE( wavFileSizeHeader,  4 );
        header.writeUInt32BE( WAVE_HEX,           8 );

        // fmt sub-chunk
        header.writeUInt32BE( FMT_HEX,           12 );
        header.writeUInt32LE( PCM_SIZE,          16 );
        header.writeUInt16LE( PCM_FORMAT_CODE,   20 );
        header.writeUInt16LE( numChannels,       22 );
        header.writeUInt32LE( sampleRate,        24 );
        header.writeUInt32LE( byteRate,          28 );
        header.writeUInt16LE( 2 * bitDepth / 8,  32 );
        header.writeUInt16LE( bitDepth,          34 );

        // data sub-chunk
        header.writeUInt32BE( DATA_HEX,          36 );
        header.writeUInt32LE( wavDataSizeHeader, 40 );
        data = Buffer.concat( [ header, audioDataMinified ] );

        // Fin!

        console.log(`Read in ${since( readStart )} seconds.`);
        console.log(`Decoding at 1/${optimizationFactor} scale.`);

        decodeStart = new Date().getTime();

        return WavDecoder.decode( data ).then( decoded => {
          console.log(`Decoded in ${since( decodeStart )} seconds.`);
          return {
            sampleRate : decoded.sampleRate / optimizationFactor,
            channelData : decoded.channelData
          };
        });
      }).catch(err => {
        throw new Error(err);
      });
  }

  static minifyBuffer( array, level, chunkSize = 2 ){
    const outputBuffer = new Buffer( array.length/level );
    let index = 0;

    for( let i = 0; i < array.length; i += (level*chunkSize) ){
      for( let j = 0; j < chunkSize; j ++ ){
        outputBuffer[ index ] = array[i+j];
        index ++;
      }
    }

    return outputBuffer;
  }
}
module.exports = WavReader;
