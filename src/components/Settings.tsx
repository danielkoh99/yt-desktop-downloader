import { open } from "@tauri-apps/api/dialog";
import { downloadDir, homeDir } from "@tauri-apps/api/path";
import { useEffect, useState, FC } from "react";

export const Settings: FC<{
  config: { ffmpegPath?: string; downloadPath?: string };
  updateConfig: Function;
}> = ({ config, updateConfig }): JSX.Element => {
  const [ffmpegErr, setFfmpegErr] = useState<string>("");
  const [selectedPaths, setSelectedPaths] = useState<{
    ffmpegPath?: string | undefined;
    downloadPath?: string;
  }>({ ffmpegPath: config.ffmpegPath, downloadPath: config.downloadPath });

  useEffect(() => {
    updateConfig(selectedPaths);
  }, [selectedPaths]);

  async function openDownloadDirPicker() {
    const selected = await open({
      multiple: false,
      directory: true,
      defaultPath: await downloadDir(),
    });
    if (selected) {
      setSelectedPaths({
        downloadPath: selected as string,
        ffmpegPath: selectedPaths.ffmpegPath,
      });
    } else {
      // user canceled
    }
  }
  async function openFFmpegDirPicker() {
    const selected = await open({
      multiple: false,
      directory: false,
      defaultPath: await homeDir(),
    });
    if (selected) {
      if (selected.includes("ffmpeg")) {
        setSelectedPaths({
          downloadPath: selectedPaths.downloadPath,
          ffmpegPath: selected as string,
        });
        setFfmpegErr("");
      } else {
        setFfmpegErr("This is not a correct ffmpeg executable path");
      }
    } else {
      setFfmpegErr("");
      // user canceled
    }
  }
  return (
    <div className="text-gray-200 flex flex-col h-full w-full justify-between px-5">
      <div className="flex flex-col w-full justify-start items-start gap-4">
        <div className="flex flex-col w-full">
          <div>Choose download directory</div>
          <div className="flex flex-row w-full gap-2">
            <button
              className="text-sm border transition-all cursor-pointer w-1/4 flex justify-center rounded-lg p-2 hover:bg-gray-200 hover:text-black"
              onClick={openDownloadDirPicker}
            >
              <div className="flex flex-row justify-center items-center gap-1">
                Choose...
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth="1.5"
                  stroke="currentColor"
                  className="w-6 h-6"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 10.5v6m3-3H9m4.06-7.19l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z"
                  />
                </svg>
              </div>
            </button>
            <input
              type="text"
              disabled
              className="select-none cursor-not-allowed bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-800 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500 transition-all"
              required
              value={selectedPaths.downloadPath}
            ></input>
          </div>
        </div>
        <div className="flex flex-col w-full">
          <div>Set FFMPEG path</div>
          <div className="flex flex-row w-full gap-2">
            <button
              className="text-sm border transition-all cursor-pointer w-1/4 flex justify-center rounded-lg p-2 hover:bg-gray-200 hover:text-black "
              onClick={openFFmpegDirPicker}
            >
              <div className="flex flex-row justify-center items-center gap-1">
                Choose...
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth="1.5"
                  stroke="currentColor"
                  className="w-6 h-6"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 10.5v6m3-3H9m4.06-7.19l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z"
                  />
                </svg>
              </div>
            </button>
            <input
              type="text"
              disabled
              className="select-none cursor-not-allowed bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-800 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500 transition-all"
              required
              value={selectedPaths.ffmpegPath}
            ></input>
          </div>
          {ffmpegErr.length > 1 ? (
            <div className="text-red-300">{ffmpegErr}</div>
          ) : (
            ""
          )}
        </div>
      </div>
    </div>
  );
};
export default Settings;
