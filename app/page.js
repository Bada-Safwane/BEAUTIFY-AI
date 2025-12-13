'use client';

import { useState, useEffect } from 'react';
import { Upload, Sparkles, Image as ImageIcon, X, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function Home() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [generatedImageUrl, setGeneratedImageUrl] = useState(null);
  const [email, setEmail] = useState('');
  const [showDownload, setShowDownload] = useState(false);
  const [processingText, setProcessingText] = useState('Processing...');
  const [showPricingPopup, setShowPricingPopup] = useState(false);
  const [showEmailPopup, setShowEmailPopup] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [currentPage, setCurrentPage] = useState('home');

  // Processing animation effect
  useEffect(() => {
    if (!isLoading) return;

    const baseText = 'Processing...';
    let currentLength = baseText.length;
    let direction = -1; // -1 for removing, 1 for adding

    const interval = setInterval(() => {
      if (direction === -1) {
        currentLength--;
        if (currentLength <= 1) {
          direction = 1;
        }
      } else {
        currentLength++;
        if (currentLength >= baseText.length) {
          direction = -1;
        }
      }
      setProcessingText(baseText.substring(0, currentLength) + '');
    }, 150);

    return () => clearInterval(interval);
  }, [isLoading]);

  const datingApps = [
    {
      name: 'Tinder',
      logo: 'https://upload.wikimedia.org/wikipedia/commons/e/e1/TinderIcon-2017.svg',
      color: 'from-red-500 to-pink-500'
    },
    {
      name: 'Bumble',
      logo: '/BMBL.svg',
      color: 'from-yellow-400 to-yellow-600'
    },
    {
      name: 'Hinge',
      logo: '/hinge.png',
      color: 'from-rose-400 to-red-500'
    },
    {
      name: 'Instagram',
      logo: 'https://upload.wikimedia.org/wikipedia/commons/9/95/Instagram_logo_2022.svg',
      color: 'from-pink-500 to-purple-600'
    }
  ];

  const beforeAfterPairs = [
    {
      before: 'https://images.pexels.com/photos/1105666/pexels-photo-1105666.jpeg?auto=compress&cs=tinysrgb&w=400',
      after: 'https://images.pexels.com/photos/1166644/pexels-photo-1166644.jpeg?auto=compress&cs=tinysrgb&w=400',
      label: 'Style Transfer'
    },
    {
      before: 'https://images.pexels.com/photos/1049298/pexels-photo-1049298.jpeg?auto=compress&cs=tinysrgb&w=400',
      after: 'https://images.pexels.com/photos/1591373/pexels-photo-1591373.jpeg?auto=compress&cs=tinysrgb&w=400',
      label: 'Enhancement'
    },
    {
      before: 'https://images.pexels.com/photos/1183099/pexels-photo-1183099.jpeg?auto=compress&cs=tinysrgb&w=400',
      after: 'https://images.pexels.com/photos/1758144/pexels-photo-1758144.jpeg?auto=compress&cs=tinysrgb&w=400',
      label: 'Transformation'
    }
  ];

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setGeneratedImageUrl(null);
      setShowDownload(false);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleStart = async () => {
    if (!selectedFile) {
      setError('Please select an image first');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('prompt', prompt);

      const response = await fetch('/api/ia', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('AI Processing Result:', data);
      
      if (data.success && data.imageUrl) {
        setGeneratedImageUrl(data.imageUrl);
        setShowDownload(true);
      }
    } catch (err) {
      console.error('Error during AI processing:', err);
      setError(err.message || 'Failed to process image');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = () => {
    if (!generatedImageUrl) {
      setError('No image available to download');
      return;
    }
    setShowPricingPopup(true);
  };

  const handleProceedToEmail = () => {
    setShowPricingPopup(false);
    setShowEmailPopup(true);
  };

  const handleFinalDownload = async () => {
    if (!email || !email.includes('@')) {
      setError('Please enter a valid email address');
      return;
    }

    if (!generatedImageUrl) {
      setError('No image available to download');
      return;
    }

    try {
      // Save to MongoDB first
      const saveResponse = await fetch('/api/save-download', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          imageUrl: generatedImageUrl,
          plan: selectedPlan,
        }),
      });

      if (!saveResponse.ok) {
        console.error('Failed to save download record');
      }

      // Download the image
      const response = await fetch(generatedImageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ai-enhanced-${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      console.log('Download initiated for email:', email);
      setShowEmailPopup(false);
      setEmail('');
    } catch (err) {
      console.error('Download error:', err);
      setError('Failed to download image');
    }
  };

  const handleRemoveImage = () => {
    setSelectedFile(null);
    setImagePreview(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 flex flex-col">
      {/* Header */}
      <header className="w-full py-4 px-6 bg-slate-950/50 backdrop-blur-md border-b border-slate-700/50">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <button 
            onClick={() => setCurrentPage('home')}
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
          >
            <Sparkles className="w-5 h-5 text-cyan-400" />
            <span className="font-semibold text-white">AI Image Studio</span>
          </button>
          <nav className="flex gap-6 text-sm text-slate-400">
            <button onClick={() => setCurrentPage('home')} className="hover:text-cyan-400 transition-colors">Features</button>
            <button onClick={() => setCurrentPage('pricing')} className="hover:text-cyan-400 transition-colors">Pricing</button>
            <button onClick={() => setCurrentPage('about')} className="hover:text-cyan-400 transition-colors">About</button>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 w-full">
        {currentPage === 'home' && (
        <div className="max-w-6xl mx-auto px-6 py-12">
          {/* Title */}
          <div className="text-center mb-16">
            <h1 className="text-5xl md:text-6xl font-bold text-white mb-4">
              Get more matches with photos that
              <br />
              <span className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">showcase your best self</span>
            </h1>
            <p className="text-lg text-slate-300 max-w-2xl mx-auto">
            Make your imperfect pictures look perfect with Beatify AI
            </p>
          </div>

          {/* Overlapping Polaroid Style Images Grid */}
          <div className="mb-16">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12 max-w-6xl mx-auto">
              {beforeAfterPairs.map((pair, index) => (
                <div key={index} className="flex justify-center items-center">
                  <div className="relative w-full max-w-xs h-80">
                    {/* Before Polaroid - Rotated Left */}
                    <div className="absolute left-0 top-0 w-56 h-80 bg-white p-3 pb-14 shadow-2xl rotate-[-8deg] hover:rotate-[-2deg] transition-all duration-300 hover:scale-105 hover:z-20">
                      <div className="relative w-full h-52 overflow-hidden bg-slate-300">
                        <img
                          src={pair.before}
                          alt="Before"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="mt-3 text-center">
                        <p className="text-xs font-handwriting text-slate-800">BEFORE</p>
                        <p className="text-xs font-semibold text-slate-600 mt-1">{pair.label}</p>
                      </div>
                    </div>

                    {/* After Polaroid - Rotated Right */}
                    <div className="absolute right-0 top-6 w-56 h-80 bg-white p-3 pb-14 shadow-2xl rotate-[6deg] hover:rotate-[2deg] transition-all duration-300 hover:scale-105 hover:z-20">
                      <div className="relative w-full h-52 overflow-hidden bg-slate-300">
                        <img
                          src={pair.after}
                          alt="After"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="mt-3 text-center">
                        <p className="text-xs font-handwriting text-slate-800">AFTER</p>
                        <p className="text-xs font-semibold text-slate-600 mt-1">Enhanced</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Catchphrase */}
          <div className="text-center mb-12">
            <p className="text-2xl md:text-3xl font-light text-slate-200 italic">
              "Be part of the top 10% most viewed profiles on social media"
            </p>
          </div>

          {/* Application Names */}
          <div className="text-center mb-16">
            <p className="text-xs tracking-widest text-slate-500 uppercase mb-6">Perfect for</p>
            <div className="flex flex-wrap justify-center gap-4">
              {datingApps.map((app, index) => (
                <div
                  key={index}
                  className="group flex items-center gap-2 px-4 py-2 rounded-full bg-slate-800/50 backdrop-blur-sm border border-slate-700/50 hover:border-cyan-500/50 transition-all duration-300 hover:scale-105 cursor-pointer"
                >
                  <div className="relative">
                    <img
                      src={app.logo}
                      alt={app.name}
                      className="w-6 h-6 object-contain"
                    />
                  </div>
                  <span className="text-slate-400 text-sm font-semibold group-hover:text-cyan-400 transition-colors duration-300">{app.name}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Image Uploader */}
          <div className="max-w-4xl mx-auto mb-20">
            <div className="w-full">
              <div
                className={`relative border-2 border-dashed rounded-2xl p-12 transition-all h-full flex flex-col ${
                  isDragging
                    ? 'border-cyan-400 bg-cyan-950/30'
                    : 'border-slate-600 bg-slate-800/50 hover:border-slate-500'
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                {imagePreview && (
                  <button
                    onClick={handleRemoveImage}
                    className="absolute top-4 right-4 p-2 bg-blue-900 hover:bg-blue-800 text-white rounded-full shadow-lg transition-colors duration-200 z-20"
                    title="Remove image"
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                  id="file-upload"
                />
                {/* Processing Overlay */}
                {isLoading && (
                  <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm rounded-2xl z-30 flex items-center justify-center">
                    <div className="text-center">
                      <div className="mb-4">
                        <Sparkles className="w-16 h-16 text-cyan-400 mx-auto animate-pulse" />
                      </div>
                      <h3 className="text-3xl font-bold text-white mb-2">
                        {processingText}
                      </h3>
                      <p className="text-slate-300 text-sm">AI is enhancing your image</p>
                    </div>
                  </div>
                )}

                <div className="text-center flex flex-col justify-center flex-1">
                  {imagePreview ? (
                    <>
                      {/* Before/After Image Display */}
                      {generatedImageUrl ? (
                        <div className="mb-2">
                          <div className="grid grid-cols-2 gap-4 mb-2 max-w-2xl mx-auto">
                            {/* Before Image */}
                            <div className="relative">
                              <div className="absolute top-2 left-2 bg-slate-900/80 text-white px-3 py-1 rounded-full text-xs font-semibold z-10">
                                Before
                              </div>
                              <div className="aspect-square rounded-lg overflow-hidden border-2 border-slate-600">
                                <img
                                  src={imagePreview}
                                  alt="Original"
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            </div>
                            {/* After Image */}
                            <div className="relative">
                              <div className="absolute top-2 left-2 bg-cyan-500 text-white px-3 py-1 rounded-full text-xs font-semibold z-10">
                                After
                              </div>
                              <div className="aspect-square rounded-lg overflow-hidden border-2 border-cyan-500">
                                <img
                                  src={generatedImageUrl}
                                  alt="Enhanced"
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="mb-4">
                          <div className="relative w-full max-w-xs mx-auto">
                            <div className="aspect-square rounded-lg overflow-hidden border-2 border-slate-600">
                              <img
                                src={imagePreview}
                                alt="Preview"
                                className="w-full h-full object-cover"
                              />
                            </div>
                          </div>
                        </div>
                      )}

                      <h3 className="text-lg font-semibold text-white mb-1">
                        {selectedFile?.name}
                      </h3>
                      <p className="text-slate-400 mb-4 text-sm">
                        {(selectedFile?.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                      {error && (
                        <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-300 text-sm">
                          {error}
                        </div>
                      )}
                      
                      {!generatedImageUrl && (
                        <>
                          <div className="flex gap-4 justify-center flex-wrap">
                            <Button
                              onClick={handleStart}
                              disabled={isLoading}
                              size="lg"
                              className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white px-6 py-4 text-sm shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <Sparkles className="w-4 h-4 mr-2" />
                              Start AI Processing
                            </Button>
                            <label
                              htmlFor="file-upload"
                              className="inline-flex items-center px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 cursor-pointer transition-colors shadow-lg text-sm"
                            >
                              <Upload className="w-4 h-4 mr-2" />
                              Change Image
                            </label>
                          </div>
                        </>
                      )}
                      
                      {generatedImageUrl && (
                        <div className="flex flex-col gap-3 items-center w-full max-w-md mx-auto">
                          <Button
                            onClick={() => {
                              document.getElementById('file-upload').click();
                            }}
                            size="lg"
                            className="bg-slate-700 hover:bg-slate-600 text-white w-full py-4"
                          >
                            Process Another Image
                          </Button>
                          <Button
                            onClick={handleDownload}
                            size="lg"
                            className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white w-full py-4"
                          >
                            <Download className="w-5 h-5 mr-2" />
                            Download Image
                          </Button>
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      <div className="mb-4 flex justify-center">
                        <div className="p-4 bg-cyan-950/50 rounded-full">
                          <ImageIcon className="w-8 h-8 text-cyan-400" />
                        </div>
                      </div>
                      <h3 className="text-xl font-semibold text-white mb-2">
                        Drop your image here
                      </h3>
                      <p className="text-slate-400 mb-6">
                        or click to browse from your device
                      </p>
                    <div className="flex justify-center">
                      <label
                        htmlFor="file-upload"
                        className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-lg hover:from-cyan-700 hover:to-blue-700 cursor-pointer transition-colors shadow-lg"
                      >
                        <Upload className="w-5 h-5 mr-2" />
                        Choose Image
                      </label>
                    </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Pricing Popup */}
          {showPricingPopup && (
            <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-3xl p-8 border border-cyan-500/30 shadow-2xl max-w-2xl w-full relative">
                <button
                  onClick={() => setShowPricingPopup(false)}
                  className="absolute top-4 right-4 p-2 bg-slate-700 hover:bg-slate-600 text-white rounded-full shadow-lg transition-colors duration-200"
                >
                  <X className="w-5 h-5" />
                </button>
                
                <div className="text-center mb-8">
                  <h3 className="text-3xl font-bold text-white mb-2">
                    Choose Your Plan
                  </h3>
                  <p className="text-slate-300">
                    Select the perfect plan for your needs
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                  {/* Single Image Plan */}
                  <div 
                    onClick={() => setSelectedPlan('single')}
                    className={`bg-slate-800/50 rounded-2xl p-6 border-2 transition-all cursor-pointer hover:scale-105 ${
                      selectedPlan === 'single' ? 'border-cyan-500 shadow-cyan-500/20' : 'border-slate-700/50'
                    }`}
                  >
                    <div className="text-center">
                      <p className="text-slate-400 text-sm uppercase tracking-widest mb-2">Single Image</p>
                      <div className="mb-4">
                        <span className="text-4xl font-bold text-white">€3.99</span>
                      </div>
                      <ul className="text-left space-y-2 text-slate-300 text-sm">
                        <li className="flex items-center gap-2">
                          <span className="text-cyan-400">✓</span>
                          1 Image Credit
                        </li>
                        <li className="flex items-center gap-2">
                          <span className="text-cyan-400">✓</span>
                          AI-Powered Enhancement
                        </li>
                        <li className="flex items-center gap-2">
                          <span className="text-cyan-400">✓</span>
                          High-Quality Results
                        </li>
                      </ul>
                    </div>
                  </div>

                  {/* 3 Images Plan */}
                  <div 
                    onClick={() => setSelectedPlan('triple')}
                    className={`bg-slate-800/50 rounded-2xl p-6 border-2 transition-all cursor-pointer hover:scale-105 relative ${
                      selectedPlan === 'triple' ? 'border-cyan-500 shadow-cyan-500/20' : 'border-slate-700/50'
                    }`}
                  >
                    <div className="absolute -top-3 right-4 bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-xs font-bold px-3 py-1 rounded-full">
                      BEST VALUE
                    </div>
                    <div className="text-center">
                      <p className="text-slate-400 text-sm uppercase tracking-widest mb-2">3 Images Bundle</p>
                      <div className="mb-4">
                        <span className="text-4xl font-bold text-white">€9.99</span>
                      </div>
                      <ul className="text-left space-y-2 text-slate-300 text-sm">
                        <li className="flex items-center gap-2">
                          <span className="text-cyan-400">✓</span>
                          3 Image Credits
                        </li>
                        <li className="flex items-center gap-2">
                          <span className="text-cyan-400">✓</span>
                          AI-Powered Enhancement
                        </li>
                        <li className="flex items-center gap-2">
                          <span className="text-cyan-400">✓</span>
                          Save €2.00
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>

                <Button
                  onClick={handleProceedToEmail}
                  disabled={!selectedPlan}
                  className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-semibold py-3 rounded-xl transition-all duration-300 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Proceed to Payment
                </Button>
              </div>
            </div>
          )}

          {/* Email Popup */}
          {showEmailPopup && (
            <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-3xl p-8 border border-cyan-500/30 shadow-2xl max-w-md w-full relative">
                <button
                  onClick={() => setShowEmailPopup(false)}
                  className="absolute top-4 right-4 p-2 bg-slate-700 hover:bg-slate-600 text-white rounded-full shadow-lg transition-colors duration-200"
                >
                  <X className="w-5 h-5" />
                </button>
                
                <div className="text-center mb-6">
                  <h3 className="text-2xl font-bold text-white mb-2">
                    🎉 Almost There!
                  </h3>
                  <p className="text-slate-300 text-sm">
                    Enter your email to complete your purchase and download
                  </p>
                </div>
                
                {error && (
                  <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-300 text-sm">
                    {error}
                  </div>
                )}

                <div className="mb-6">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your.email@example.com"
                    className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                  />
                </div>

                <Button
                  onClick={handleFinalDownload}
                  className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-semibold py-3 rounded-xl transition-all duration-300 shadow-lg"
                >
                  <Download className="w-5 h-5 mr-2 inline" />
                  Complete & Download
                </Button>
              </div>
            </div>
          )}

          {/* Testimonials Masonry Section */}
          <div className="mt-20 mb-12">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                Loved by <span className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">Thousands</span>
              </h2>
              <p className="text-slate-400">See the amazing transformations our users have achieved</p>
            </div>
            
            {/* Flex Masonry Layout - Three columns with custom height distribution */}
            <div className="flex gap-6 max-w-6xl mx-auto justify-center">
              {/* Column 1: Small, Large, Medium, Small */}
              <div className="flex flex-col gap-6 w-full md:w-[calc(50%-12px)] lg:w-[calc(33.333%-16px)]">
                {/* Card 1 - Small (h-72) */}
                <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl overflow-hidden border border-slate-700/50 hover:border-cyan-500/50 transition-colors duration-300 flex flex-col h-72">
                  <div className="h-40 bg-gradient-to-br from-cyan-500 to-blue-600 relative overflow-hidden flex-shrink-0">
                    <img src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=300&fit=crop" alt="Before" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/20 flex items-end p-4">
                      <div><p className="text-white font-semibold">Sarah M.</p><p className="text-cyan-200 text-sm">3 matches in 24h</p></div>
                    </div>
                  </div>
                  <div className="p-4 flex-grow flex flex-col justify-between">
                    <p className="text-slate-300 text-sm">"The quality is incredible! My photos look so much better!"</p>
                    <div className="flex gap-1 mt-2">{'★'.repeat(5).split('').map((_, i) => <span key={i} className="text-yellow-400 text-sm">★</span>)}</div>
                  </div>
                </div>

                {/* Card 2 - Large (h-96) */}
                <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl overflow-hidden border border-slate-700/50 hover:border-cyan-500/50 transition-colors duration-300 flex flex-col h-96">
                  <div className="h-56 bg-gradient-to-br from-orange-500 to-red-600 relative overflow-hidden flex-shrink-0">
                    <img src="https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&h=300&fit=crop" alt="Amazing" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/20 flex items-end p-4">
                      <div><p className="text-white font-semibold">David M.</p><p className="text-orange-200 text-sm">Real conversations</p></div>
                    </div>
                  </div>
                  <div className="p-4 flex-grow flex flex-col justify-between">
                    <p className="text-slate-300 text-sm">"Amazing quality enhancement! Got way more matches than expected and finally having real conversations!"</p>
                    <div className="flex gap-1 mt-2">{[...Array(5)].map((_, i) => <span key={i} className="text-yellow-400 text-sm">★</span>)}</div>
                  </div>
                </div>

                {/* Card 3 - Medium (h-80) */}
                <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl overflow-hidden border border-slate-700/50 hover:border-cyan-500/50 transition-colors duration-300 flex flex-col h-80">
                  <div className="h-48 bg-gradient-to-br from-purple-500 to-indigo-600 relative overflow-hidden flex-shrink-0">
                    <img src="https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&h=300&fit=crop" alt="Success" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/20 flex items-end p-4">
                      <div><p className="text-white font-semibold">Jessica K.</p><p className="text-purple-200 text-sm">7 conversations</p></div>
                    </div>
                  </div>
                  <div className="p-4 flex-grow flex flex-col justify-between">
                    <p className="text-slate-300 text-sm">"Best investment for my profile! Finally getting quality matches!"</p>
                    <div className="flex gap-1 mt-2">{[...Array(5)].map((_, i) => <span key={i} className="text-yellow-400 text-sm">★</span>)}</div>
                  </div>
                </div>

                {/* Card 4 - Small (h-72) */}
                <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl overflow-hidden border border-slate-700/50 hover:border-cyan-500/50 transition-colors duration-300 flex flex-col h-72">
                  <div className="h-40 bg-gradient-to-br from-emerald-500 to-teal-600 relative overflow-hidden flex-shrink-0">
                    <img src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=300&fit=crop" alt="Result" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/20 flex items-end p-4">
                      <div><p className="text-white font-semibold">Marcus L.</p><p className="text-teal-200 text-sm">6 matches</p></div>
                    </div>
                  </div>
                  <div className="p-4 flex-grow flex flex-col justify-between">
                    <p className="text-slate-300 text-sm">"Seriously impressed with the enhancement quality!"</p>
                    <div className="flex gap-1 mt-2">{[...Array(5)].map((_, i) => <span key={i} className="text-yellow-400 text-sm">★</span>)}</div>
                  </div>
                </div>
              </div>

              {/* Column 2: Large, Small, Small, Medium */}
              <div className="flex flex-col gap-6 w-full md:w-[calc(50%-12px)] lg:w-[calc(33.333%-16px)]">
                {/* Card 5 - Large (h-96) */}
                <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl overflow-hidden border border-slate-700/50 hover:border-cyan-500/50 transition-colors duration-300 flex flex-col h-96">
                  <div className="h-56 bg-gradient-to-br from-pink-500 to-rose-600 relative overflow-hidden flex-shrink-0">
                    <img src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=300&fit=crop" alt="Transformed" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/20 flex items-end p-4">
                      <div><p className="text-white font-semibold">Emma L.</p><p className="text-pink-200 text-sm">5 matches today</p></div>
                    </div>
                  </div>
                  <div className="p-4 flex-grow flex flex-col justify-between">
                    <p className="text-slate-300 text-sm">"Changed my dating game completely. The AI enhancement makes me look naturally beautiful! This is exactly what I was looking for!"</p>
                    <div className="flex gap-1 mt-2">{[...Array(5)].map((_, i) => <span key={i} className="text-yellow-400 text-sm">★</span>)}</div>
                  </div>
                </div>

                {/* Card 6 - Small (h-72) */}
                <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl overflow-hidden border border-slate-700/50 hover:border-cyan-500/50 transition-colors duration-300 flex flex-col h-72">
                  <div className="h-40 bg-gradient-to-br from-yellow-500 to-amber-600 relative overflow-hidden flex-shrink-0">
                    <img src="https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400&h=300&fit=crop" alt="Incredible" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/20 flex items-end p-4">
                      <div><p className="text-white font-semibold">Chris P.</p><p className="text-yellow-200 text-sm">8 matches in 2 days</p></div>
                    </div>
                  </div>
                  <div className="p-4 flex-grow flex flex-col justify-between">
                    <p className="text-slate-300 text-sm">"Absolutely love the results! My profile looks amazing!"</p>
                    <div className="flex gap-1 mt-2">{[...Array(5)].map((_, i) => <span key={i} className="text-yellow-400 text-sm">★</span>)}</div>
                  </div>
                </div>

                {/* Card 7 - Small (h-72) */}
                <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl overflow-hidden border border-slate-700/50 hover:border-cyan-500/50 transition-colors duration-300 flex flex-col h-72">
                  <div className="h-40 bg-gradient-to-br from-red-500 to-pink-600 relative overflow-hidden flex-shrink-0">
                    <img src="https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=400&h=300&fit=crop" alt="Stunning" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/20 flex items-end p-4">
                      <div><p className="text-white font-semibold">Taylor R.</p><p className="text-pink-200 text-sm">4 new matches</p></div>
                    </div>
                  </div>
                  <div className="p-4 flex-grow flex flex-col justify-between">
                    <p className="text-slate-300 text-sm">"Worth every penny for the quality!"</p>
                    <div className="flex gap-1 mt-2">{[...Array(5)].map((_, i) => <span key={i} className="text-yellow-400 text-sm">★</span>)}</div>
                  </div>
                </div>

                {/* Card 8 - Medium (h-80) */}
                <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl overflow-hidden border border-slate-700/50 hover:border-cyan-500/50 transition-colors duration-300 flex flex-col h-80">
                  <div className="h-48 bg-gradient-to-br from-blue-500 to-cyan-600 relative overflow-hidden flex-shrink-0">
                    <img src="https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&h=300&fit=crop" alt="Success" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/20 flex items-end p-4">
                      <div><p className="text-white font-semibold">Jordan K.</p><p className="text-cyan-200 text-sm">9 conversations</p></div>
                    </div>
                  </div>
                  <div className="p-4 flex-grow flex flex-col justify-between">
                    <p className="text-slate-300 text-sm">"The transformation is unreal! Highly recommended!"</p>
                    <div className="flex gap-1 mt-2">{[...Array(5)].map((_, i) => <span key={i} className="text-yellow-400 text-sm">★</span>)}</div>
                  </div>
                </div>
              </div>

              {/* Column 3: Medium, Small, Large, Small */}
              <div className="flex flex-col gap-6 w-full md:w-[calc(50%-12px)] lg:w-[calc(33.333%-16px)]">
                {/* Card 9 - Medium (h-80) */}
                <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl overflow-hidden border border-slate-700/50 hover:border-cyan-500/50 transition-colors duration-300 flex flex-col h-80">
                  <div className="h-48 bg-gradient-to-br from-violet-500 to-purple-600 relative overflow-hidden flex-shrink-0">
                    <img src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=300&fit=crop" alt="Stunning" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/20 flex items-end p-4">
                      <div><p className="text-white font-semibold">Alex T.</p><p className="text-violet-200 text-sm">10 new matches</p></div>
                    </div>
                  </div>
                  <div className="p-4 flex-grow flex flex-col justify-between">
                    <p className="text-slate-300 text-sm">"Transformed my entire dating experience. Can't recommend enough!"</p>
                    <div className="flex gap-1 mt-2">{[...Array(5)].map((_, i) => <span key={i} className="text-yellow-400 text-sm">★</span>)}</div>
                  </div>
                </div>

                {/* Card 10 - Small (h-72) */}
                <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl overflow-hidden border border-slate-700/50 hover:border-cyan-500/50 transition-colors duration-300 flex flex-col h-72">
                  <div className="h-40 bg-gradient-to-br from-indigo-500 to-blue-600 relative overflow-hidden flex-shrink-0">
                    <img src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=300&fit=crop" alt="Result" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/20 flex items-end p-4">
                      <div><p className="text-white font-semibold">Morgan R.</p><p className="text-indigo-200 text-sm">5 matches</p></div>
                    </div>
                  </div>
                  <div className="p-4 flex-grow flex flex-col justify-between">
                    <p className="text-slate-300 text-sm">"Super happy with my enhanced photos!"</p>
                    <div className="flex gap-1 mt-2">{[...Array(5)].map((_, i) => <span key={i} className="text-yellow-400 text-sm">★</span>)}</div>
                  </div>
                </div>

                {/* Card 11 - Large (h-96) */}
                <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl overflow-hidden border border-slate-700/50 hover:border-cyan-500/50 transition-colors duration-300 flex flex-col h-96">
                  <div className="h-56 bg-gradient-to-br from-lime-500 to-green-600 relative overflow-hidden flex-shrink-0">
                    <img src="https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&h=300&fit=crop" alt="Success" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/20 flex items-end p-4">
                      <div><p className="text-white font-semibold">Casey S.</p><p className="text-green-200 text-sm">11 matches</p></div>
                    </div>
                  </div>
                  <div className="p-4 flex-grow flex flex-col justify-between">
                    <p className="text-slate-300 text-sm">"Stunning transformations! The AI enhancement is truly next-level and way better than any filter!"</p>
                    <div className="flex gap-1 mt-2">{[...Array(5)].map((_, i) => <span key={i} className="text-yellow-400 text-sm">★</span>)}</div>
                  </div>
                </div>

                {/* Card 12 - Small (h-72) */}
                <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl overflow-hidden border border-slate-700/50 hover:border-cyan-500/50 transition-colors duration-300 flex flex-col h-72">
                  <div className="h-40 bg-gradient-to-br from-rose-500 to-red-600 relative overflow-hidden flex-shrink-0">
                    <img src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=300&fit=crop" alt="Amazing" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/20 flex items-end p-4">
                      <div><p className="text-white font-semibold">Riley P.</p><p className="text-rose-200 text-sm">7 matches</p></div>
                    </div>
                  </div>
                  <div className="p-4 flex-grow flex flex-col justify-between">
                    <p className="text-slate-300 text-sm">"One of the best purchases I've made!"</p>
                    <div className="flex gap-1 mt-2">{[...Array(5)].map((_, i) => <span key={i} className="text-yellow-400 text-sm">★</span>)}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        )}

        {/* Pricing Page */}
        {currentPage === 'pricing' && (
          <div className="max-w-4xl mx-auto px-6 py-12">
            <div className="text-center mb-12">
              <h1 className="text-5xl font-bold text-white mb-4">
                Simple, Transparent <span className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">Pricing</span>
              </h1>
              <p className="text-lg text-slate-300">Choose the plan that works best for you</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
              {/* Single Image Plan */}
              <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-3xl p-8 border border-slate-700/50 hover:border-cyan-500/30 transition-all duration-300 hover:scale-105">
                <div className="text-center">
                  <p className="text-slate-400 text-sm uppercase tracking-widest mb-4">Single Image</p>
                  <div className="mb-6">
                    <span className="text-5xl font-bold text-white">€3.99</span>
                  </div>
                  <ul className="text-left space-y-3 mb-8 text-slate-300">
                    <li className="flex items-center gap-2">
                      <span className="text-cyan-400">✓</span>
                      1 Image Credit
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-cyan-400">✓</span>
                      AI-Powered Enhancement
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-cyan-400">✓</span>
                      High-Quality Results
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-cyan-400">✓</span>
                      Instant Processing
                    </li>
                  </ul>
                  <Button
                    onClick={() => setCurrentPage('home')}
                    className="w-full bg-slate-700 hover:bg-slate-600 text-white font-semibold py-3 rounded-xl transition-all duration-300"
                  >
                    Get Started
                  </Button>
                </div>
              </div>

              {/* 3 Images Plan */}
              <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-3xl p-8 border border-cyan-500/30 hover:border-cyan-500/50 transition-all duration-300 hover:scale-105 relative">
                <div className="absolute -top-3 right-4 bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-xs font-bold px-3 py-1 rounded-full">
                  BEST VALUE
                </div>
                <div className="text-center">
                  <p className="text-slate-400 text-sm uppercase tracking-widest mb-4">3 Images Bundle</p>
                  <div className="mb-6">
                    <span className="text-5xl font-bold text-white">€9.99</span>
                  </div>
                  <ul className="text-left space-y-3 mb-8 text-slate-300">
                    <li className="flex items-center gap-2">
                      <span className="text-cyan-400">✓</span>
                      3 Image Credits
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-cyan-400">✓</span>
                      AI-Powered Enhancement
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-cyan-400">✓</span>
                      High-Quality Results
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="text-cyan-400">✓</span>
                      Save €2.00
                    </li>
                  </ul>
                  <Button
                    onClick={() => setCurrentPage('home')}
                    className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-semibold py-3 rounded-xl transition-all duration-300"
                  >
                    Get Started
                  </Button>
                </div>
              </div>
            </div>

            <div className="text-center text-slate-400 text-sm">
              <p>All prices include secure payment processing. No subscription required.</p>
            </div>
          </div>
        )}

        {/* About Page */}
        {currentPage === 'about' && (
          <div className="max-w-4xl mx-auto px-6 py-12">
            <div className="text-center mb-12">
              <h1 className="text-5xl font-bold text-white mb-4">
                About <span className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">AI Image Studio</span>
              </h1>
              <p className="text-lg text-slate-300">Transforming your photos with cutting-edge AI technology</p>
            </div>

            <div className="space-y-8">
              <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-8 border border-slate-700/50">
                <h2 className="text-2xl font-bold text-white mb-4">Our Mission</h2>
                <p className="text-slate-300 leading-relaxed">
                  At AI Image Studio, we believe everyone deserves to present their best self online. Our advanced AI technology enhances your photos while maintaining their natural authenticity, helping you stand out on dating apps and social media.
                </p>
              </div>

              <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-8 border border-slate-700/50">
                <h2 className="text-2xl font-bold text-white mb-4">How It Works</h2>
                <div className="space-y-4 text-slate-300">
                  <div className="flex gap-4">
                    <div className="flex-shrink-0 w-8 h-8 bg-cyan-500 rounded-full flex items-center justify-center text-white font-bold">1</div>
                    <div>
                      <h3 className="font-semibold text-white mb-1">Upload Your Photo</h3>
                      <p>Simply drag and drop or select an image from your device.</p>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div className="flex-shrink-0 w-8 h-8 bg-cyan-500 rounded-full flex items-center justify-center text-white font-bold">2</div>
                    <div>
                      <h3 className="font-semibold text-white mb-1">AI Enhancement</h3>
                      <p>Our advanced algorithms analyze and enhance your photo automatically.</p>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div className="flex-shrink-0 w-8 h-8 bg-cyan-500 rounded-full flex items-center justify-center text-white font-bold">3</div>
                    <div>
                      <h3 className="font-semibold text-white mb-1">Download & Share</h3>
                      <p>Get your enhanced photo instantly and use it anywhere you want.</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-8 border border-slate-700/50">
                <h2 className="text-2xl font-bold text-white mb-4">Why Choose Us</h2>
                <ul className="space-y-3 text-slate-300">
                  <li className="flex items-start gap-2">
                    <span className="text-cyan-400 mt-1">✓</span>
                    <span><strong className="text-white">Advanced AI Technology:</strong> State-of-the-art machine learning models for natural-looking results</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-cyan-400 mt-1">✓</span>
                    <span><strong className="text-white">Instant Processing:</strong> Get your enhanced photos in seconds</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-cyan-400 mt-1">✓</span>
                    <span><strong className="text-white">Privacy First:</strong> Your photos are processed securely and never stored permanently</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-cyan-400 mt-1">✓</span>
                    <span><strong className="text-white">No Subscription:</strong> Pay only for what you need, no hidden fees</span>
                  </li>
                </ul>
              </div>

              <div className="text-center">
                <Button
                  onClick={() => setCurrentPage('home')}
                  className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-semibold px-8 py-3 rounded-xl transition-all duration-300"
                >
                  Try It Now
                </Button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="w-full py-6 px-6 bg-slate-950/50 border-t border-slate-700/50">
        <div className="max-w-7xl mx-auto text-center text-sm text-slate-400">
          <p>© 2024 AI Image Studio. Powered by advanced machine learning.</p>
        </div>
      </footer>
    </div>
  );
}
