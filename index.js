const fft     = require("fft-js").fft;
const fftUtil = require("fft-js").util;

const Correlation = require("node-correlation");
const WavReader = require("./wav-reader");

const songA = [];
const songB = [];
const liveBuffer = [];

const getFreqResponse = ( buffer )=>{
  const phasors = fft( buffer );
  const freqs = fftUtil.fftFreq( phasors, 44100/8 );
  const mags  = fftUtil.fftMag ( phasors );
  return mags;
};

const getCorrelation = ( a, b )=>{
  return Correlation.calc( a, b );
};

const getBestSong = ( songs, nowPlayingBuffer )=>{
  nowPlayingBuffer = nowPlayingBuffer.slice(0,1024);
  const fNowPlaying = getFreqResponse( nowPlayingBuffer );
  let bestSong = null;
  let bestSongScore = -Infinity;
  songs.forEach( s=>{
    const fSum = [];
    for( let i = 0; i < s.buffer.length - nowPlayingBuffer.length; i += nowPlayingBuffer.length ){
      if( i + nowPlayingBuffer.length >= s.buffer.length ){
        continue;
      }
      const testBuf = s.buffer.slice( i, i+nowPlayingBuffer.length );
      const fSong = getFreqResponse( testBuf );
      fSong.forEach((f, ix)=>{
        if( fSum[ ix ] === undefined ){
          fSum[ ix ] = 0;
        }
        fSum[ ix ] += f;
      });
    }
    const score = getCorrelation( 
      fSum.slice( 256, 512 ), 
      fNowPlaying.slice( 256, 512 ) 
    );
    console.log( score );
    if( score > bestSongScore ){
      bestSongScore = score;
      bestSong = s;
    }
  });
  return bestSong;
};

const getCurrentSong = ( songs, nowPlayingBuffer )=>{
  if( songs.length === 1 ){
    return songs[0];
  }else{
    return getBestSong( songs, nowPlayingBuffer );
  }
};

const songs = [
  "./sun-system.wav",
  "./home-2.wav"  
];

const toArray = ( typedArray )=>{
  return Array.prototype.slice.call(typedArray);
}

WavReader.read( "./overlap-home-2.wav", 32 ).then( result=>{
  const liveBuffer = result.channelData[0];
  Promise.all(
    songs.map(s=>WavReader.read(s, 32))
  ).then( results=>{
    results = results.map( data=>data.channelData[0] );
    console.log( 
      getCurrentSong( 
        results.map((r, i)=>{
          return {
            title  : songs[i],
            buffer : r
          }
        }),
        liveBuffer
      ).title
    );
  })
  .catch(e=>console.log(e));
})
.catch(e=>console.log(e));