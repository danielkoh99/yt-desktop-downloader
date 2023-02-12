import urllib
import eyed3
from pytube import YouTube,Playlist
from time import sleep
import os
import argparse
parser = argparse.ArgumentParser()
parser.add_argument("-u", "--url", required=True)
parser.add_argument("-f", "--ffmpegpath", required=True)
parser.add_argument("-d", "--downloaddir", required=True)
args = parser.parse_args()
os.environ["IMAGEIO_FFMPEG_EXE"] = args.ffmpegpath
from moviepy.audio.io.AudioFileClip import AudioFileClip
TGT_FOLDER = args.downloaddir

def download(yturl,output_p):
    yt = YouTube(yturl)
    filename = yt.streams.get_audio_only().download(
            output_path=output_p)
    response = urllib.request.urlopen(yt.thumbnail_url)
    imagedata = response.read()
    counter = 0
    working = True
    while counter < 11 and working:
        if os.path.isfile(filename):
            clip = AudioFileClip(filename)
            clip.write_audiofile(filename[:-4] + ".mp3")
            clip.close()
            audiofile = eyed3.load(filename[:-4] + ".mp3")
            audiofile.tag.album_artist = yt.author
            audiofile.tag.title = yt.title
            audiofile.tag.images.set(3, imagedata, "image/jpeg", "Description")
            audiofile.tag.save(version=eyed3.id3.ID3_V2_3)
            os.remove(filename)
            working = False
        else:
            counter += 1
            sleep(5*60)
            
            
            
if args.url.find('playlist') != -1:
     p = Playlist(args.url)
     for url in p.video_urls:
        print(url)
        output = TGT_FOLDER + '/' + p.title
        download(url, output)
else:
   download(args.url, TGT_FOLDER)
        