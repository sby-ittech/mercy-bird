import { useEffect, useState } from 'react'

/** Creates an object URL for a Blob and revokes it when the Blob changes or the component unmounts. */
export function useObjectUrl(blob: Blob | undefined | null): string | null {
  const [url, setUrl] = useState<string | null>(null)
  useEffect(() => {
    if (!blob) {
      setUrl(null)
      return
    }
    const objectUrl = URL.createObjectURL(blob)
    setUrl(objectUrl)
    return () => URL.revokeObjectURL(objectUrl)
  }, [blob])
  return url
}
