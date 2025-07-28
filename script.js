        let selectedFiles = [];

        document.getElementById('pdfInput').addEventListener('change', (event) => {
            const newFiles = Array.from(event.target.files);
            if (newFiles.length === 0) {
                document.getElementById('status').textContent = 'No files selected.';
                return;
            }
            selectedFiles = [...selectedFiles, ...newFiles];
            updateFileList();
            document.getElementById('status').textContent = `${newFiles.length} file(s) added. Total: ${selectedFiles.length} file(s).`;
            event.target.value = '';
        });

        function updateFileList() {
            const fileListDiv = document.getElementById('fileList');
            if (!fileListDiv) {
                document.getElementById('status').textContent = 'Error: File list container not found.';
                return;
            }
            fileListDiv.innerHTML = '';
            if (selectedFiles.length > 0) {
                const ul = document.createElement('ul');
                ul.id = 'fileListUl';
                selectedFiles.forEach((file, index) => {
                    const li = document.createElement('li');
                    li.setAttribute('draggable', 'true');
                    li.setAttribute('data-index', index);
                    li.innerHTML = `<span>${index + 1}. ${file.name}</span><button class="remove-btn" onclick="removeFile(${index})">X</button>`;
                    ul.appendChild(li);
                });
                fileListDiv.appendChild(ul);
                addDragAndDropListeners();
            } else {
                fileListDiv.innerHTML = '<p>No files selected.</p>';
            }
        }

        function removeFile(index) {
            selectedFiles.splice(index, 1);
            updateFileList();
            document.getElementById('status').textContent = `File removed. Total: ${selectedFiles.length} file(s).`;
        }

        function addDragAndDropListeners() {
            const ul = document.getElementById('fileListUl');
            let draggedItem = null;

            ul.addEventListener('dragstart', (e) => {
                if (e.target.tagName === 'LI') {
                    draggedItem = e.target;
                    draggedItem.classList.add('dragging');
                    e.dataTransfer.setData('text/plain', e.target.getAttribute('data-index'));
                }
            });

            ul.addEventListener('dragend', (e) => {
                if (e.target.tagName === 'LI') {
                    e.target.classList.remove('dragging');
                    draggedItem = null;
                }
            });

            ul.addEventListener('dragover', (e) => {
                e.preventDefault();
                const target = e.target.closest('li');
                if (target && draggedItem && target !== draggedItem) {
                    const allItems = [...ul.querySelectorAll('li')];
                    const draggedIndex = parseInt(draggedItem.getAttribute('data-index'));
                    const targetIndex = parseInt(target.getAttribute('data-index'));
                    const rect = target.getBoundingClientRect();
                    const isAbove = e.clientY < rect.top + rect.height / 2;

                    if (draggedIndex < targetIndex && isAbove) {
                        ul.insertBefore(draggedItem, target);
                    } else if (draggedIndex > targetIndex && !isAbove) {
                        ul.insertBefore(draggedItem, target.nextSibling);
                    } else if (draggedIndex < targetIndex && !isAbove) {
                        ul.insertBefore(draggedItem, target.nextSibling);
                    } else if (draggedIndex > targetIndex && isAbove) {
                        ul.insertBefore(draggedItem, target);
                    }
                }
            });

            ul.addEventListener('drop', (e) => {
                e.preventDefault();
                const allItems = [...ul.querySelectorAll('li')];
                const newOrder = allItems.map(item => parseInt(item.getAttribute('data-index')));
                const reorderedFiles = newOrder.map(index => selectedFiles[index]);
                selectedFiles = reorderedFiles;
                updateFileList();
                document.getElementById('status').textContent = `File order updated. Total: ${selectedFiles.length} file(s).`;
            });
        }

        async function mergePDFs() {
            const status = document.getElementById('status');
            const downloadLink = document.getElementById('downloadLink');
            status.textContent = 'Processing...';
            downloadLink.style.display = 'none';

            try {
                if (selectedFiles.length < 1) {
                    status.textContent = 'Error: Please select at least one PDF file.';
                    return;
                }

                const mergedPdf = await PDFLib.PDFDocument.create();

                for (const file of selectedFiles) {
                    const arrayBuffer = await file.arrayBuffer();
                    try {
                        const pdf = await PDFLib.PDFDocument.load(arrayBuffer);
                        const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
                        copiedPages.forEach((page) => mergedPdf.addPage(page));
                    } catch (fileError) {
                        status.textContent = `Error processing ${file.name}: ${fileError.message}`;
                        return;
                    }
                }

                const pdfBytes = await mergedPdf.save();
                const blob = new Blob([pdfBytes], { type: 'application/pdf' });
                const url = URL.createObjectURL(blob);

                // Use custom file name
                const defaultFileName = 'alltools.pdf';
                downloadLink.href = url;
                downloadLink.setAttribute('download', defaultFileName);
                downloadLink.textContent = `Download ${defaultFileName}`;
                downloadLink.style.display = 'inline-block';
                status.textContent = `PDFs merged successfully! Click the download link to save ${defaultFileName} or wait for automatic download.`;

                try {
                    const link = document.createElement('a');
                    link.href = url;
                    link.download = defaultFileName;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                } catch (autoDownloadError) {
                    status.textContent += ' (Automatic download failed, please use the download link.)';
                }

                setTimeout(() => {
                    URL.revokeObjectURL(url);
                }, 60000);
            } catch (error) {
                status.textContent = 'Error merging PDFs: ' + error.message;
            }
        }