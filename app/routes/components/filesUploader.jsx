const handleDropZoneDrop = useCallback(
  async (_dropFiles, acceptedFiles, _rejectedFiles) => {
    const formData = new FormData();

    if (acceptedFiles.length) {
      setFiles(acceptedFiles);
    }

    acceptedFiles.forEach((file) => {
      formData.append("files", file);
    });

    const result = await fetch("/file", {
      method: "POST",
      headers: {
        contentType: "multipart/form-data",
      },
      body: formData,
    });
  },
  [],
);
