#!/bin/bash
# trim silence, normalise loudness (EBU R128 -16 LUFS), encode mono MP3 64 kb/s
set -e
for eng in pocket-tts qwen3-tts kokoro; do
  mkdir -p $eng/mp3
  for f in $eng/wav/*.wav; do
    b=$(basename $f .wav); [[ $b == _ref_* ]] && continue
    ffmpeg -loglevel error -y -i $f -af "silenceremove=start_periods=1:start_duration=0.03:start_threshold=-45dB:start_silence=0.05,areverse,silenceremove=start_periods=1:start_duration=0.03:start_threshold=-45dB:start_silence=0.12,areverse,silenceremove=stop_periods=-1:stop_duration=0.45:stop_threshold=-45dB:stop_silence=0.35,loudnorm=I=-16:TP=-1.5:LRA=11,aresample=24000" -ac 1 -c:a libmp3lame -b:a 64k $eng/mp3/$b.mp3
  done
done
mkdir -p compare
ffmpeg -loglevel error -y -f lavfi -i anullsrc=r=24000:cl=mono -t 0.8 -c:a libmp3lame -b:a 64k compare/_gap.mp3
for eng in pocket-tts qwen3-tts kokoro; do
  printf "file '%s'\n" ../$eng/mp3/cam_intro.mp3 _gap.mp3 ../$eng/mp3/cam_ask.mp3 _gap.mp3 ../$eng/mp3/noe_intro.mp3 > compare/_list_$eng.txt
  ffmpeg -loglevel error -y -f concat -safe 0 -i compare/_list_$eng.txt -c:a libmp3lame -b:a 64k compare/${eng}_3lines.mp3
done
rm compare/_list_*.txt compare/_gap.mp3
