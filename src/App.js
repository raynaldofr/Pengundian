import React, { useState, useRef, useEffect } from 'react';

// Main App component
const App = () => {
  // State to store the list of participants, now as objects
  const [participants, setParticipants] = useState([]);
  // State to store the list of prizes (simple strings)
  const [prizes, setPrizes] = useState([]);
  // State to store the current prize input
  const [newPrize, setNewPrize] = useState('');
  // State to store the number of winners to draw in one go
  const [numberOfWinnersToDraw, setNumberOfWinnersToDraw] = useState(1);
  // State to store the drawn results for the current batch draw (array of {winner: obj, prize: string})
  const [currentDrawResults, setCurrentDrawResults] = useState([]);
  // State to control the animation
  const [isDrawing, setIsDrawing] = useState(false);
  // State to store the history of all winners
  const [winnersHistory, setWinnersHistory] = useState([]);
  // Ref for the file input element
  const fileInputRef = useRef(null);
  // Ref for the animation element (for visual effect)
  const animationRef = useRef(null);
  // State for eligible participants (those who haven't won yet in the current session)
  const [eligibleParticipants, setEligibleParticipants] = useState([]);

  // States for animation display (used for the "shuffling" effect)
  const [currentAnimatedName, setCurrentAnimatedName] = useState('Mengacak...');
  const [currentAnimatedCode, setCurrentAnimatedCode] = useState('...'); // This is the 'Nomor Code Peserta'
  const [currentAnimatedPrizeName, setCurrentAnimatedPrizeName] = useState('');

  // State for LLM-generated thank you message
  const [thankYouMessage, setThankYouMessage] = useState('');
  const [isGeneratingThankYou, setIsGeneratingThankYou] = useState(false);


  // Initialize eligible participants when participants list changes
  useEffect(() => {
    setEligibleParticipants(participants);
  }, [participants]);

  // Custom message box function (replaces alert)
  const showMessage = (message) => {
    console.log("Message:", message);
    const messageBox = document.createElement('div');
    messageBox.textContent = message;
    messageBox.className = 'fixed top-4 left-1/2 -translate-x-1/2 bg-gray-800 text-white p-3 rounded-lg shadow-lg z-50 transition-opacity duration-300 opacity-0';
    document.body.appendChild(messageBox);

    setTimeout(() => {
      messageBox.style.opacity = '1';
    }, 10); // Small delay to trigger transition

    setTimeout(() => {
      messageBox.style.opacity = '0';
      messageBox.addEventListener('transitionend', () => messageBox.remove());
    }, 3000); // Message disappears after 3 seconds
  };

  // Function to handle CSV file upload
  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target.result;
        const lines = text.split('\n').filter(line => line.trim() !== '');

        if (lines.length === 0) {
          showMessage('File CSV kosong.');
          return;
        }

        // Check for header row
        const header = lines[0].split(',').map(h => h.trim());
        // Updated expected headers
        const expectedHeaders = ['Nama Peserta', 'Keterangan', 'Nomor Code Peserta']; // Changed 'Keterangan Peserta' to 'Keterangan'
        const hasValidHeaders = expectedHeaders.every(h => header.includes(h));

        if (!hasValidHeaders) {
          showMessage('Header CSV tidak valid. Pastikan ada "Nama Peserta,Keterangan,Nomor Code Peserta".'); // Changed 'Keterangan Peserta' to 'Keterangan'
          return;
        }

        // Find index of each header
        const nameIndex = header.indexOf('Nama Peserta');
        const keteranganIndex = header.indexOf('Keterangan'); // Changed from 'Keterangan Peserta'
        const codeIndex = header.indexOf('Nomor Code Peserta');

        const parsedParticipants = [];
        for (let i = 1; i < lines.length; i++) { // Start from 1 to skip header
          const columns = lines[i].split(',').map(item => item.trim());
          const name = columns[nameIndex];
          const keterangan = columns[keteranganIndex]; // Changed from phone
          const code = columns[codeIndex];

          if (name) { // Ensure name is not empty
            parsedParticipants.push({
              id: crypto.randomUUID(), // Add a unique ID for easier tracking
              name: name || 'Tidak Ada Nama', // Default if empty
              keterangan: keterangan || 'Tidak Ada Keterangan', // Changed from phone
              code: code || 'Tidak Ada Kode' // Default if empty
            });
          }
        }

        if (parsedParticipants.length === 0) {
          showMessage('Tidak ada peserta yang valid ditemukan di file CSV. Pastikan formatnya benar.');
          return;
        }

        setParticipants(parsedParticipants);
        setEligibleParticipants(parsedParticipants); // Reset eligible participants on new upload
        showMessage(`Berhasil mengunggah ${parsedParticipants.length} peserta dari file CSV!`);
      };
      reader.readAsText(file);
    }
  };

  // Function to add a new prize
  const handleAddPrize = () => {
    if (newPrize.trim() !== '') {
      setPrizes([...prizes, newPrize.trim()]);
      setNewPrize('');
    }
  };

  // Function to remove a prize
  const handleRemovePrize = (indexToRemove) => {
    setPrizes(prizes.filter((_, index) => index !== indexToRemove));
  };

  // Function to download winners history as CSV
  const handleDownloadWinners = () => {
    if (winnersHistory.length === 0) {
      showMessage('Tidak ada rekapan pemenang untuk diunduh.');
      return;
    }

    // Updated headers for CSV download
    const headers = 'Waktu Pengundian,Nama Pemenang,Keterangan,Nomor Code Pemenang,Hadiah\n'; // Changed No HP to Keterangan
    const csvContent = winnersHistory.map(item =>
      `${item.timestamp},"${item.winner.name}","${item.winner.keterangan}","${item.winner.code}","${item.prize}"` // Changed item.winner.phone to item.winner.keterangan
    ).join('\n');

    const fullCsv = headers + csvContent;
    console.log("Generated CSV content:", fullCsv); // Log the CSV content
    const blob = new Blob([fullCsv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) { // Feature detection for download attribute
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', 'rekapan_pemenang_undian.csv');
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url); // Clean up
      console.log("Download initiated successfully."); // Log download initiation
    } else {
      showMessage('Browser Anda tidak mendukung pengunduhan file secara langsung.');
      console.error("Download failed: Browser does not support download attribute."); // Log download failure
    }
  };

  // Function to download sample CSV file
  const handleDownloadSampleCSV = () => {
    // Updated sample data
    const sampleData = `Nama Peserta,Keterangan,Nomor Code Peserta\nBudi Santoso,Keterangan Budi,ABC001\nSiti Aminah,Keterangan Siti,XYZ002\nJoko Susilo,Keterangan Joko,PQR003\nMaria Dewi,Keterangan Maria,LMN004`; // Changed No HP to Keterangan
    const blob = new Blob([sampleData], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', 'contoh_peserta.csv');
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } else {
      showMessage('Browser Anda tidak mendukung pengunduhan file secara langsung.');
    }
  };

  // Function to start the drawing animation and select winners
  const startDrawing = () => {
    if (eligibleParticipants.length < numberOfWinnersToDraw) {
      showMessage(`Jumlah peserta yang memenuhi syarat (${eligibleParticipants.length}) tidak cukup untuk mengundi ${numberOfWinnersToDraw} pemenang. Unggah lebih banyak peserta atau kurangi jumlah pemenang.`);
      return;
    }
    if (prizes.length === 0) {
      showMessage('Mohon masukkan daftar hadiah terlebih dahulu.');
      return;
    }

    setIsDrawing(true);
    setCurrentDrawResults([]); // Clear previous results
    setCurrentAnimatedName('Mengacak...'); // Reset animating text
    setCurrentAnimatedCode('...');
    setCurrentAnimatedPrizeName('');

    let animationCounter = 0;
    const maxAnimations = 30; // Number of quick changes before settling
    const animationInterval = 100; // Milliseconds between changes

    const intervalId = setInterval(() => {
      // Randomly pick a temporary winner and prize for animation effect
      const tempWinner = eligibleParticipants[Math.floor(Math.random() * eligibleParticipants.length)];
      const tempPrize = prizes[Math.floor(Math.random() * prizes.length)];

      // Update the animating states
      setCurrentAnimatedName(tempWinner ? tempWinner.name : '...');
      setCurrentAnimatedCode(tempWinner ? tempWinner.code : '...');
      setCurrentAnimatedPrizeName(tempPrize || '...');

      animationCounter++;
      if (animationCounter >= maxAnimations) {
        clearInterval(intervalId);

        const selectedWinners = [];
        const tempEligibleParticipants = [...eligibleParticipants]; // Copy to modify
        const tempPrizes = [...prizes]; // Copy to cycle through

        for (let i = 0; i < numberOfWinnersToDraw; i++) {
          if (tempEligibleParticipants.length === 0) {
            showMessage('Tidak ada peserta yang cukup untuk mengundi semua hadiah.');
            break;
          }

          // Select a unique winner
          const winnerIndex = Math.floor(Math.random() * tempEligibleParticipants.length);
          const finalWinner = tempEligibleParticipants.splice(winnerIndex, 1)[0]; // Remove to ensure uniqueness

          // Select a prize (cycle through available prizes if needed)
          const finalPrize = tempPrizes[i % tempPrizes.length];

          selectedWinners.push({ winner: finalWinner, prize: finalPrize, timestamp: new Date().toLocaleString() }); // Add timestamp here
        }

        // Freeze on the first winner's details for a moment before showing full list
        if (selectedWinners.length > 0) {
            setCurrentAnimatedName(selectedWinners[0].winner.name);
            setCurrentAnimatedCode(selectedWinners[0].winner.code);
            setCurrentAnimatedPrizeName(selectedWinners[0].prize);
        } else {
            setCurrentAnimatedName('Tidak Ada Pemenang');
            setCurrentAnimatedCode('...');
            setCurrentAnimatedPrizeName('Tidak Ada Hadiah');
        }


        // Short delay before showing the full list of winners
        setTimeout(() => {
            setCurrentDrawResults(selectedWinners); // Set the results for display
            setIsDrawing(false); // End drawing state
            setWinnersHistory(prevHistory => [...prevHistory, ...selectedWinners]);
            setEligibleParticipants(prevEligible =>
                prevEligible.filter(p => !selectedWinners.some(sw => sw.winner.id === p.id))
            );
        }, 800); // 800ms delay after animation stops, before full results appear

      }
    }, animationInterval);
  };

  // Function to reset the application state
  const resetApp = () => {
    setParticipants([]);
    setEligibleParticipants([]);
    setPrizes([]);
    setNewPrize('');
    setNumberOfWinnersToDraw(1); // Reset to default
    setCurrentDrawResults([]); // Clear current results
    setIsDrawing(false);
    setWinnersHistory([]); // Clear winners history on reset
    setCurrentAnimatedName('Mengacak...'); // Reset animating text
    setCurrentAnimatedCode('...');
    setCurrentAnimatedPrizeName('');
    if (fileInputRef.current) {
      fileInputRef.current.value = ''; // Clear the file input
    }
  };

  // Function to generate a thank you message using Gemini API
  const generateThankYouMessage = async () => {
    if (winnersHistory.length === 0) {
      showMessage('Tidak ada pemenang dalam rekapan untuk membuat pesan terima kasih.');
      return;
    }

    setIsGeneratingThankYou(true);
    try {
      let chatHistory = [];
      const winnerCount = winnersHistory.length;
      const prizeExamples = winnersHistory.map(item => item.prize).filter((value, index, self) => self.indexOf(value) === index).slice(0, 3).join(', '); // Get up to 3 unique prize examples

      const prompt = `Buat pesan terima kasih yang singkat dan tulus (maksimal 50 kata) untuk acara pengundian hadiah. Sebutkan bahwa ada ${winnerCount} pemenang. Jika memungkinkan, sebutkan beberapa contoh hadiah yang diundi seperti: ${prizeExamples || 'berbagai hadiah menarik'}. Pesan ini ditujukan kepada semua peserta dan pemenang.`;
      chatHistory.push({ role: "user", parts: [{ text: prompt }] });
      const payload = { contents: chatHistory };
      const apiKey = ""; // If you want to use models other than gemini-2.0-flash or imagen-3.0-generate-002, provide an API key here. Otherwise, leave this as-is.
      const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const result = await response.json();
      if (result.candidates && result.candidates.length > 0 &&
        result.candidates[0].content && result.candidates[0].content.parts &&
        result.candidates[0].content.parts.length > 0) {
        const text = result.candidates[0].content.parts[0].text;
        setThankYouMessage(text);
        showMessage('Pesan terima kasih berhasil dibuat!');
      } else {
        showMessage('Gagal membuat pesan terima kasih. Coba lagi.');
        console.error('Gemini API response error:', result);
      }
    } catch (error) {
      showMessage('Terjadi kesalahan saat menghubungi Gemini API.');
      console.error('Error calling Gemini API:', error);
    } finally {
      setIsGeneratingThankYou(false);
    }
  };


  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 to-blue-500 flex items-center justify-center p-4 font-inter relative"> {/* Added relative for positioning */}
      <div className="bg-white p-8 rounded-3xl shadow-2xl w-full max-w-4xl transform transition-all duration-300 hover:scale-105">
        <h1 className="text-4xl font-extrabold text-center text-gray-800 mb-8">
          Aplikasi Pengundian Hadiah
        </h1>

        {/* Participant Upload Section */}
        <div className="mb-8 p-6 bg-purple-50 rounded-2xl shadow-inner">
          <h2 className="text-2xl font-bold text-purple-700 mb-4">1. Unggah Peserta (CSV)</h2>
          <input
            type="file"
            accept=".csv"
            onChange={handleFileUpload}
            ref={fileInputRef}
            className="block w-full text-sm text-gray-700 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-purple-100 file:text-purple-700 hover:file:bg-purple-200 cursor-pointer transition-colors"
          />
          <p className="text-sm text-gray-600 mt-2">
            *Unggah file CSV Anda. Untuk file Excel (.xlsx), Anda perlu mengkonversinya ke CSV terlebih dahulu.
          </p>
          {/* CSV Format Guide */}
          <div className="mt-4 p-4 bg-purple-100 rounded-lg border border-purple-200">
            <h3 className="text-lg font-semibold text-purple-800 mb-2">Panduan Format File CSV:</h3>
            <ul className="list-disc list-inside text-gray-700 text-sm">
              <li>File harus dalam format CSV (.csv).</li>
              {/* Updated header in guide */}
              <li>Baris pertama harus menjadi header dengan nama kolom: <code className="font-mono text-gray-900">Nama Peserta,Keterangan,Nomor Code Peserta</code>.</li>
              <li>Setiap baris berikutnya harus berisi data peserta sesuai urutan kolom.</li>
              <li>Contoh:</li>
              <pre className="bg-gray-50 p-2 rounded-md mt-1 text-xs text-gray-800 border border-gray-200">
                Nama Peserta,Keterangan,Nomor Code Peserta<br/>
                Budi Santoso,Keterangan Budi,ABC001<br/>
                Siti Aminah,Keterangan Siti,XYZ002<br/>
                Joko Susilo,Keterangan Joko,PQR003
              </pre>
            </ul>
            <button
              onClick={handleDownloadSampleCSV}
              className="mt-4 bg-purple-500 text-white px-4 py-2 rounded-lg font-semibold hover:bg-purple-600 transition-colors shadow-md"
            >
              Unduh Contoh File CSV
            </button>
          </div>

          {participants.length > 0 && (
            <div className="mt-4">
              <h3 className="text-lg font-semibold text-gray-700">Peserta Terunggah ({participants.length}):</h3>
              <div className="max-h-32 overflow-y-auto bg-white p-3 rounded-lg border border-gray-200 mt-2">
                <ul className="list-disc list-inside text-gray-800">
                  {/* Displaying Keterangan instead of HP */}
                  {participants.map((p) => (
                    <li key={p.id} className="text-sm">{p.name} (Keterangan: {p.keterangan}, Kode: {p.code})</li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Prize Input Section */}
        <div className="mb-8 p-6 bg-blue-50 rounded-2xl shadow-inner">
          <h2 className="text-2xl font-bold text-blue-700 mb-4">2. Masukkan Hadiah</h2>
          <div className="flex gap-2 mb-4">
            <input
              type="text"
              value={newPrize}
              onChange={(e) => setNewPrize(e.target.value)}
              placeholder="Nama Hadiah (misal: Sepeda, TV)"
              className="flex-grow p-3 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all"
            />
            <button
              onClick={handleAddPrize}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors shadow-md transform hover:scale-105"
            >
              Tambah Hadiah
            </button>
          </div>
          {prizes.length > 0 && (
            <div className="mt-4">
              <h3 className="text-lg font-semibold text-gray-700">Daftar Hadiah ({prizes.length}):</h3>
              <ul className="list-disc list-inside text-gray-800 bg-white p-3 rounded-lg border border-gray-200 mt-2">
                {prizes.map((prize, index) => (
                  <li key={index} className="flex justify-between items-center text-sm py-1">
                    {prize}
                    <button
                      onClick={() => handleRemovePrize(index)}
                      className="ml-4 text-red-500 hover:text-red-700 transition-colors"
                      title="Hapus Hadiah"
                    >
                      &times;
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Drawing Configuration Section */}
        <div className="mb-8 p-6 bg-green-50 rounded-2xl shadow-inner">
          <h2 className="text-2xl font-bold text-green-700 mb-4">3. Konfigurasi Pengundian</h2>
          <div className="flex items-center gap-4 mb-4">
            <label htmlFor="numWinners" className="text-lg font-semibold text-gray-700">Jumlah Pemenang yang Diundi:</label>
            <input
              type="number"
              id="numWinners"
              min="1"
              value={numberOfWinnersToDraw}
              onChange={(e) => setNumberOfWinnersToDraw(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-24 p-2 border border-green-300 rounded-lg focus:ring-2 focus:ring-green-400 text-center"
            />
          </div>
          <button
            onClick={startDrawing} // Call the simplified startDrawing
            disabled={isDrawing || eligibleParticipants.length < numberOfWinnersToDraw || prizes.length === 0 || numberOfWinnersToDraw === 0}
            className={`bg-green-600 text-white text-xl font-bold px-10 py-4 rounded-full shadow-lg transform transition-all duration-300 ${
              (isDrawing || eligibleParticipants.length < numberOfWinnersToDraw || prizes.length === 0 || numberOfWinnersToDraw === 0) ? 'opacity-60 cursor-not-allowed' : 'hover:bg-green-700 hover:scale-105 active:scale-95'
            }`}
          >
            {isDrawing ? 'Mengundi...' : 'Mulai Undi!'}
          </button>
        </div>

        {/* Animation and Result Display (Integrated) */}
        <div className="p-6 bg-yellow-50 rounded-2xl shadow-inner min-h-[200px] flex flex-col justify-center items-center mb-8">
          <h2 className="text-2xl font-bold text-yellow-700 mb-4">Hasil Pengundian</h2>
          {isDrawing ? ( // Show animating state
            <div className="text-center w-full max-w-2xl bg-white border-4 border-yellow-400 rounded-xl p-6 shadow-lg">
              <p className="text-3xl font-extrabold mb-2 text-yellow-800">Mengundi...</p>
              <p className="text-5xl font-black text-green-600 mb-4 animate-pulse-fast">
                {currentAnimatedName}
              </p>
              <p className="text-3xl font-semibold text-orange-600 mb-2 animate-pulse-fast">
                Kode: {currentAnimatedCode}
              </p>
              <p className="text-2xl font-semibold text-blue-600 animate-pulse-fast">
                Hadiah: <span className="font-bold">{currentAnimatedPrizeName}</span>
              </p>
            </div>
          ) : ( // Show final winner state or initial message
            currentDrawResults.length > 0 ? (
              <div className="text-gray-800 max-h-60 overflow-y-auto w-full max-w-2xl bg-white border-4 border-yellow-400 rounded-xl p-6 text-center shadow-lg animate-fade-in">
                <p className="text-3xl font-extrabold mb-4 text-yellow-800">Selamat Kepada Para Pemenang!</p>
                {currentDrawResults.map((result, index) => (
                  <div key={index} className="mb-4 p-3 border border-green-200 rounded-lg bg-green-50 last:mb-0">
                    <p className="text-2xl font-black text-green-600">
                      {result.winner.name}
                    </p>
                    <p className="text-xl font-semibold text-blue-600">
                      Memenangkan: <span className="font-bold">{result.prize}</span>
                    </p>
                    <p className="text-sm text-gray-700 mt-1">
                      Keterangan: {result.winner.keterangan} | Kode: {result.winner.code}
                    </p>
                  </div>
                ))}
              </div>
            ) : ( // Default state before any draw or after all draws are complete
              <p className="text-xl text-gray-500">Tekan "Mulai Undi!" untuk melihat hasilnya.</p>
            )
          )}
        </div>

        {/* Winners History Section */}
        <div className="mt-8 p-6 bg-gray-100 rounded-2xl shadow-inner">
          <h2 className="text-2xl font-bold text-gray-700 mb-4">4. Rekapan Pemenang</h2>
          {winnersHistory.length > 0 ? (
            <>
              <div className="max-h-96 overflow-y-auto bg-white p-3 rounded-lg border border-gray-200 mb-4">
                <table className="min-w-full text-left text-gray-800">
                  <thead>
                    <tr>
                      <th className="py-2 px-4 border-b-2 border-gray-300 text-sm font-semibold text-gray-600">Waktu</th>
                      <th className="py-2 px-4 border-b-2 border-gray-300 text-sm font-semibold text-gray-600">Nama Pemenang</th>
                      <th className="py-2 px-4 border-b-2 border-gray-300 text-sm font-semibold text-gray-600">Keterangan</th>
                      <th className="py-2 px-4 border-b-2 border-gray-300 text-sm font-semibold text-gray-600">Kode Peserta</th>
                      <th className="py-2 px-4 border-b-2 border-gray-300 text-sm font-semibold text-gray-600">Hadiah</th>
                    </tr>
                  </thead>
                  <tbody>
                    {winnersHistory.map((item, index) => (
                      <tr key={index} className="border-b border-gray-100 last:border-b-0">
                        <td className="py-2 px-4 text-sm">{item.timestamp}</td>
                        <td className="py-2 px-4 text-sm font-medium">{item.winner.name}</td>
                        <td className="py-2 px-4 text-sm">{item.winner.keterangan}</td>
                        <td className="py-2 px-4 text-sm">{item.winner.code}</td>
                        <td className="py-2 px-4 text-sm">{item.prize}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button
                onClick={handleDownloadWinners}
                className="bg-indigo-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-indigo-700 transition-colors shadow-md transform hover:scale-105"
              >
                Unduh Rekapan Pemenang (CSV)
              </button>
              {/* Gemini API Feature: Generate Thank You Message */}
              <div className="mt-6 p-4 bg-yellow-100 rounded-lg border border-yellow-200">
                <h3 className="text-lg font-semibold text-yellow-800 mb-2">✨ Pesan Terima Kasih Otomatis</h3>
                <button
                  onClick={generateThankYouMessage}
                  disabled={isGeneratingThankYou || winnersHistory.length === 0}
                  className={`bg-purple-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-purple-700 transition-colors shadow-md transform hover:scale-105 flex items-center justify-center gap-2 ${isGeneratingThankYou ? 'opacity-60 cursor-not-allowed' : ''}`}
                >
                  {isGeneratingThankYou ? (
                    <>
                      <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Membuat Pesan...
                    </>
                  ) : (
                    <>✨ Buat Pesan Terima Kasih</>
                  )}
                </button>
                {thankYouMessage && (
                  <div className="mt-4 p-3 bg-white border border-gray-300 rounded-lg text-gray-800 text-sm">
                    <p className="whitespace-pre-wrap">{thankYouMessage}</p>
                    <button
                      onClick={() => navigator.clipboard.writeText(thankYouMessage).then(() => showMessage('Pesan disalin!'))}
                      className="mt-2 text-blue-500 hover:text-blue-700 text-xs"
                    >
                      Salin Pesan
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <p className="text-gray-600">Belum ada pemenang yang diundi.</p>
          )}
        </div>

        {/* Footer with creator info */}
        <div className="absolute bottom-4 right-4 text-gray-600 text-sm">
          by: Raynaldofr
        </div>

        {/* Reset Button */}
        <div className="mt-8 text-center">
          <button
            onClick={resetApp}
            className="bg-red-500 text-white px-6 py-3 rounded-lg font-semibold hover:bg-red-600 transition-colors shadow-md transform hover:scale-105"
          >
            Reset Aplikasi
          </button>
        </div>
      </div>
    </div>
  );
};

export default App;
