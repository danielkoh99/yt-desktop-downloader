import { FC, useEffect, useState } from "react";
import { Command } from "@tauri-apps/api/shell";
import { invoke } from "@tauri-apps/api/tauri";

import {
  createDir,
  readDir,
  BaseDirectory,
  FileEntry,
  readTextFile,
  writeTextFile,
  exists,
  removeFile,
} from "@tauri-apps/api/fs";
import {
  isPermissionGranted,
  requestPermission,
  sendNotification,
} from "@tauri-apps/api/notification";
import { SongCard } from "./SongCard";
import { appDataDir } from "@tauri-apps/api/path";
import { UrlCard } from "./UrlCard";

export const Downloads: FC<{
  config: { downloadPath?: string; ffmpegPath?: string };
}> = ({ config }): JSX.Element => {
  const [songs, setSongs] = useState<FileEntry[]>([]);
  const [prevUrls, setPrevUrls] = useState<string[]>([]);
  const [startDownload, setStartDownlad] = useState<boolean>(false);
  const [err, setErr] = useState<boolean>(false);
  const [errMsg, setErrMsg] = useState<string>("");
  const [disabled, setDisabled] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [fSongs, setFiltered] = useState<FileEntry[]>([]);
  const [fUrls, setFilteredUrls] = useState<string[]>([]);
  const [grantedPermission, setPermissionGranted] = useState<boolean>(false);
  const [url, setUrl] = useState("");
  const youtubeRegex =
    /^((?:https?:)?\/\/)?((?:www|m)\.)?((?:youtube\.com|youtu.be))(\/(?:[\w\-]+\?v=|embed\/|v\/)?)([\w\-]+)(\S+)?$/;
  async function download() {
    const appDataDirPath = await appDataDir();
    const dataDirExists = await exists(appDataDirPath);
    if (!dataDirExists) {
      await createDir(appDataDirPath, {
        dir: BaseDirectory.AppData,
      });
    }
    const prevUrlFileExists = await exists("prevurls.json", {
      dir: BaseDirectory.AppData,
    });
    if (prevUrlFileExists) {
      const prev = await readTextFile("prevurls.json", {
        dir: BaseDirectory.AppData,
      });
      console.log(prev);
      setPrevUrls(JSON.parse(prev));
    }
    const newPrevUrls = [...prevUrls, url];
    setPrevUrls(newPrevUrls);
    const seen = new Set();
    const filteredArr = [...newPrevUrls].filter((url) => {
      const duplicate = seen.has(url);
      seen.add(url);
      return !duplicate;
    });
    setFilteredUrls(filteredArr);
    await writeTextFile(
      {
        path: "prevurls.json",
        contents: JSON.stringify(filteredArr),
      },
      { dir: BaseDirectory.AppData }
    );
    setUrl("");
    setDisabled(true);
    startProgress();
    setStartDownlad(true);
    const contents = await readTextFile("config.json", {
      dir: BaseDirectory.AppConfig,
    });
    const parsedConfig: { ffmpegPath: string; downloadPath: string } =
      JSON.parse(contents);
    const command = Command.sidecar("bin/python/test", [
      "-u",
      url,
      "-f",
      parsedConfig.ffmpegPath,
      "-d",
      parsedConfig.downloadPath,
    ]);
    const output = await command.execute();
    const { stdout, stderr } = output;
    readSongs();
    setTimeout(() => {
      if (stdout) {
        if (grantedPermission) {
          sendNotification("Successfully downloaded song");
        }
        setErr(false);
        setStartDownlad(false);
        setProgress(100);
      }
      if (stderr.length > 1) {
        setErr(true);
        setStartDownlad(false);
      }
      setTimeout(() => {
        setProgress(0);
      }, 200);
    }, 500);
  }

  function startProgress() {
    let counter: number = 0;
    const progInterval = setInterval(() => {
      counter++;
      setProgress(counter);
      if (counter === 99) {
        clearInterval(progInterval);
      }
    }, 200);
  }
  useEffect(() => {
    async function init() {
      if (
        config.downloadPath &&
        config.downloadPath === "" &&
        config.ffmpegPath === ""
      ) {
        setDisabled(true);
      } else {
        setDisabled(false);
      }

      let permissionGranted = await isPermissionGranted();
      if (!permissionGranted) {
        const permission = await requestPermission();
        if (permission === "granted") setPermissionGranted(true);
        if (permission === "denied") setPermissionGranted(false);
      }
      readPrevUrls();
    }
    readSongs();
    init();
    setTimeout(() => {
      invoke("close_splashscreen");
    }, 3000);
    document.addEventListener("contextmenu", (event) => event.preventDefault());
  }, []);

  useEffect(() => {
    const seen = new Set();
    const filteredArr = [...songs].filter((song) => {
      const duplicate = seen.has(song.path);
      seen.add(song.path);
      return !duplicate;
    });
    setFiltered(filteredArr);
  }, [songs]);

  useEffect(() => {
    readSongs();
  }, [config]);
  async function removeSong(path: string) {
    const filtered = songs.filter((item) => item.path !== path);
    setSongs(filtered);
    await removeFile(path);
  }
  async function readPrevUrls() {
    const prevUrls = await readTextFile("prevurls.json", {
      dir: BaseDirectory.AppData,
    });
    setPrevUrls(JSON.parse(prevUrls));
  }
  useEffect(() => {
    const seen = new Set();
    const filteredArr = [...prevUrls].filter((url) => {
      const duplicate = seen.has(url);
      seen.add(url);
      return !duplicate;
    });
    setFilteredUrls(filteredArr);
  }, [prevUrls]);

  function processEntries(entries: FileEntry[]) {
    for (const entry of entries) {
      if (entry.path.includes(".mp3")) {
        setSongs((prevState) => [...prevState, entry]);
      }
      if (entry.children) {
        processEntries(entry.children);
      }
    }
  }

  async function readSongs() {
    if (config.downloadPath !== undefined && config.downloadPath !== "") {
      const entries = await readDir(config.downloadPath, { recursive: true });
      processEntries(entries);
    }
  }

  function testInput(e: any) {
    setUrl(e.target.value);
    if (e.target.value === "") {
      setErrMsg("");
    } else {
      if (youtubeRegex.test(e.target.value)) {
        setErrMsg("");
        setDisabled(false);
      } else {
        setErrMsg("YouTube link is not valid");
        setDisabled(true);
      }
    }
  }

  return (
    <div className="flex flex-col h-full w-full justify-between px-5">
      <div className="flex flex-row w-full justify-center items-center gap-2">
        <input
          type="text"
          className="bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-800 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500 transition-all"
          placeholder="Enter YouTube url"
          required
          value={url}
          onChange={testInput}
        ></input>
        <svg
          onClick={url !== "" ? download : () => {}}
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth="1.5"
          stroke="currentColor"
          className={
            !disabled && url !== ""
              ? "w-6 h-6 text-white opacity-70 hover:opacity-100 cursor-pointer transition-all"
              : "w-6 h-6 text-gray-500 cursor-not-allowed "
          }
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"
          />
        </svg>
      </div>

      <div className="text-red-500">{errMsg}</div>
      {startDownload && !err ? (
        <div className="my-2 mb-2 flex flex-row items-center">
          <div className="w-full bg-gray-200 rounded-full h-1 ">
            <div
              className="bg-blue-600 h-1 rounded-full dark:bg-blue-500"
              style={{ width: progress + "%" }}
            />
          </div>
          <span className="ml-2 text-white text-xs">{progress}%</span>
        </div>
      ) : (
        <span className="my-2 mb-2 h-1 w-full bg-gray-200"></span>
      )}
      <div className="flex flex-row w-full gap-4 divide-x-2">
        <div className="flex h-auto overflow-y-scroll flex-col gap-4 w-3/5">
          <div className="text-xs text-gray-200 ">Songs in folder</div>
          <div className="flex flex-col gap-4 h-auto max-h-screen overflow-scroll">
            {fSongs.map((song, index) => (
              <SongCard
                key={song.path}
                remove={removeSong}
                name={song.name}
                path={song.path}
              ></SongCard>
            ))}
          </div>
        </div>

        <div className="pl-4 h-auto flex flex-col gap-4 w-2/5 break-all max-h-60 overflow-y-scroll">
          <div className="text-xs text-gray-200 ">
            Previously downloaded urls
          </div>
          <div className="flex flex-col gap-4 h-auto max-h-screen overflow-scroll">
            {fUrls.map((url, index) => (
              <UrlCard key={url + index.toString()} url={url}></UrlCard>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Downloads;
