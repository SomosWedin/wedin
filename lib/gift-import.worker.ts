import { readGiftImportFile } from './gift-import-file'

self.onmessage = (
  event: MessageEvent<{ name: string; buffer: ArrayBuffer }>
) => {
  try {
    self.postMessage({
      datasets: readGiftImportFile(
        event.data.name,
        new Uint8Array(event.data.buffer)
      ),
    })
  } catch (error) {
    self.postMessage({
      error:
        error instanceof Error ? error.message : 'No se pudo leer el archivo.',
    })
  }
}
