'use client';

import { useState, useEffect } from 'react';
import { useSession, signIn } from 'next-auth/react';
import { Upload, Sparkles, Image as ImageIcon, X, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function Home() {
  const { data: session } = useSession();
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
  const [showAuthPopup, setShowAuthPopup] = useState(false);
  const [authMode, setAuthMode] = useState('login');
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [currentPage, setCurrentPage] = useState('home');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [authToken, setAuthToken] = useState(null);
  const [userData, setUserData] = useState(null);
  const [userImages, setUserImages] = useState([]);
  const [isEditingAccount, setIsEditingAccount] = useState(false);
  const [editUsername, setEditUsername] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [watermarkedPreview, setWatermarkedPreview] = useState(null);
  const [swapPolaroids, setSwapPolaroids] = useState(false);

  // Handle NextAuth Google session
  useEffect(() => {
    if (session?.customToken) {
      // Store the custom JWT token from Google OAuth
      localStorage.setItem('authToken', session.customToken);
      setAuthToken(session.customToken);
      setIsLoggedIn(true);
      setUserData({
        id: session.user.id,
        username: session.user.username,
        email: session.user.email,
        credits: session.user.credits
      });
      
      // Close auth popup if open
      setShowAuthPopup(false);
      
      // If we were in payment flow, proceed to checkout
      const pendingPayment = sessionStorage.getItem('pendingPaymentPlan');
      if (pendingPayment) {
        const plan = pendingPayment;
        sessionStorage.removeItem('pendingPaymentPlan');
        proceedToCheckout(plan, session.customToken);
      } else {
        // Otherwise, redirect to account page
        setCurrentPage('account');
      }
    }
  }, [session]);

  // Check for stored token and page on mount
  useEffect(() => {
    const token = localStorage.getItem('authToken');
    const savedPage = localStorage.getItem('currentPage');
    
    if (token) {
      setAuthToken(token);
      fetchUserAccount(token);
    }
    
    if (savedPage) {
      setCurrentPage(savedPage);
    }
  }, []);

  // Swap polaroids animation every 3 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setSwapPolaroids(prev => !prev);
    }, 3000);
    
    return () => clearInterval(interval);
  }, []);

  // Persist current page to localStorage
  useEffect(() => {
    localStorage.setItem('currentPage', currentPage);
  }, [currentPage]);

  // Handle payment success callback
  useEffect(() => {
    const handlePaymentSuccess = async () => {
      const urlParams = new URLSearchParams(window.location.search);
      const paymentStatus = urlParams.get('payment');
      const shouldDownload = urlParams.get('download');

      if (paymentStatus === 'success') {
        const shouldRestore = sessionStorage.getItem('restoreAfterPayment');
        const imageToDownload = sessionStorage.getItem('pendingImageUrl');
        
        // Refresh user account data to get updated credits FIRST
        if (authToken) {
          await fetchUserAccount(authToken);
        }
        
        // Restore generated image and trigger download
        if (shouldRestore === 'true' && imageToDownload) {
          setGeneratedImageUrl(imageToDownload);
          setShowDownload(true);
          
          // Create watermarked preview
          createWatermarkedPreview(imageToDownload).then(watermarked => {
            setWatermarkedPreview(watermarked);
          });
          
          // Trigger download
          setTimeout(() => {
            fetch(imageToDownload)
              .then(response => response.blob())
              .then(blob => {
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `ai-enhanced-${Date.now()}.png`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
              })
              .catch(err => console.error('Download error:', err));
          }, 1000);
        }
        
        // Clean up sessionStorage
        sessionStorage.removeItem('pendingImageUrl');
        sessionStorage.removeItem('restoreAfterPayment');
        
        // Stay on home page
        setCurrentPage('home');
        
        // Clean up URL
        window.history.replaceState({}, document.title, window.location.pathname);
      } else if (paymentStatus === 'cancelled') {
        // Handle cancelled payment
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    };
    
    handlePaymentSuccess();
  }, [isLoggedIn]);

  // Fetch user account data
  const fetchUserAccount = async (token) => {
    try {
      const response = await fetch('/api/user/account', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setUserData(data.user);
        setUserImages(data.images);
        setIsLoggedIn(true);
      } else {
        // Token is invalid
        localStorage.removeItem('authToken');
        setAuthToken(null);
        setIsLoggedIn(false);
      }
    } catch (error) {
      console.error('Error fetching account:', error);
    }
  };

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
      name: 'LinkedIn',
      logo: 'https://upload.wikimedia.org/wikipedia/commons/c/ca/LinkedIn_logo_initials.png',
      color: 'from-blue-500 to-blue-700'
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
      before: './Morgan.jpg',
      after: './Morgan2.png',
      label: 'Enhancement'
    },
    {
      before: './before1.png',
      after: './after1.png',
      label: 'Enhancement'
    },
    {
      before: './before2.jpg',
      after: './after2.png',
      label: 'Enhancement'
    }
  ];

  const compressImage = (file, maxSizeMB = 1) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          
          // Calculate new dimensions - very aggressive resize
          const maxDimension = 1024;
          if (width > maxDimension || height > maxDimension) {
            if (width > height) {
              height = (height / width) * maxDimension;
              width = maxDimension;
            } else {
              width = (width / height) * maxDimension;
              height = maxDimension;
            }
          }
          
          canvas.width = width;
          canvas.height = height;
          
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          
          // Start with quality 0.7 and reduce if needed
          let quality = 0.7;
          const compress = () => {
            canvas.toBlob((blob) => {
              const sizeMB = blob.size / (1024 * 1024);
              if (sizeMB > maxSizeMB && quality > 0.2) {
                quality -= 0.1;
                compress();
              } else {
                const compressedFile = new File([blob], file.name, {
                  type: 'image/jpeg',
                  lastModified: Date.now()
                });
                resolve(compressedFile);
              }
            }, 'image/jpeg', quality);
          };
          compress();
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    });
  };

  const createWatermarkedPreview = (imageUrl) => {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        
        const ctx = canvas.getContext('2d');
        
        // Draw original image
        ctx.drawImage(img, 0, 0);
        
        // Add semi-transparent watermark pattern
        ctx.fillStyle = 'rgba(6, 182, 212, 0.08)';
        const patternSize = 200;
        for (let y = 0; y < canvas.height; y += patternSize) {
          for (let x = 0; x < canvas.width; x += patternSize * 2) {
            ctx.save();
            ctx.translate(x + patternSize / 2, y + patternSize / 2);
            ctx.rotate(-Math.PI / 8);
            ctx.fillRect(-patternSize / 2, -patternSize / 2, patternSize, patternSize);
            ctx.restore();
          }
        }
        
        // Add large centered watermark text
        ctx.save();
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate(-Math.PI / 8);
        ctx.font = `bold ${Math.max(canvas.width / 10, 60)}px Arial`;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.lineWidth = 3;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.strokeText('PREVIEW', 0, 0);
        ctx.fillText('PREVIEW', 0, 0);
        ctx.restore();
        
        // Convert to blob URL
        canvas.toBlob((blob) => {
          const url = URL.createObjectURL(blob);
          resolve(url);
        }, 'image/png');
      };
      img.onerror = () => resolve(imageUrl); // Fallback to original if error
      img.src = imageUrl;
    });
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (file) {
      // Compress image if it's too large
      const compressedFile = await compressImage(file);
      setSelectedFile(compressedFile);
      setGeneratedImageUrl(null);
      setWatermarkedPreview(null);
      setShowDownload(false);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(compressedFile);
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

  const handleDrop = async (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      // Compress image if it's too large
      const compressedFile = await compressImage(file);
      setSelectedFile(compressedFile);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(compressedFile);
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
        
        // Create watermarked preview for display
        const watermarked = await createWatermarkedPreview(data.imageUrl);
        setWatermarkedPreview(watermarked);
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
    
    // If user is logged in and has at least 1 credit, download directly
    if (isLoggedIn && userData && userData.credits >= 1) {
      handleAuthenticatedDownload();
    } else {
      // If not logged in or no credits, show pricing popup
      setShowPricingPopup(true);
    }
  };

  const handleProceedToEmail = async () => {
    if (!selectedPlan) {
      setError('Please select a plan');
      return;
    }

    // If user is not logged in, show auth popup instead of redirecting
    if (!isLoggedIn) {
      setShowPricingPopup(false);
      setShowAuthPopup(true);
      setAuthMode('login');
      return;
    }

    // User is logged in, proceed to checkout
    await proceedToCheckout(userData?.email);
  };

  const proceedToCheckout = async (userEmail) => {
    try {
      const headers = {
        'Content-Type': 'application/json',
      };
      
      if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
      }

      // Map frontend plan names to backend plan names
      const planMap = {
        'single': 'single',
        'triple': '3-pack',
        'premium': '10-pack'
      };

      // Determine context: if there's a generated image, it's from download flow, otherwise pricing page
      const context = generatedImageUrl ? 'download' : 'pricing';

      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          plan: planMap[selectedPlan],
          email: userEmail,
          imageUrl: generatedImageUrl || '',
          context: context
        }),
      });

      const data = await response.json();

      if (data.success && data.url) {
        // Store state before going to Stripe - only the generated image URL
        if (generatedImageUrl) {
          sessionStorage.setItem('pendingImageUrl', generatedImageUrl);
          sessionStorage.setItem('restoreAfterPayment', 'true');
        }
        
        // Redirect to Stripe checkout
        window.location.href = data.url;
      } else {
        setError('Failed to create checkout session');
      }
    } catch (err) {
      console.error('Checkout error:', err);
      setError('Failed to proceed to payment');
    }
  };

  const handleAuthSuccess = async (token) => {
    // After successful auth, fetch updated user data
    try {
      const response = await fetch('/api/user/account', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setUserData(data.user);
        setShowAuthPopup(false);
        
        // Proceed to checkout with fresh user data
        await proceedToCheckout(data.user.email);
      } else {
        setError('Failed to fetch account data');
      }
    } catch (err) {
      console.error('Error fetching user data:', err);
      setError('Failed to proceed to payment');
    }
  };

  const handlePricingPagePurchase = async (plan) => {
    // Set the selected plan first
    setSelectedPlan(plan);
    
    // If user is not logged in, show auth popup
    if (!isLoggedIn) {
      setShowAuthPopup(true);
      setAuthMode('login');
      return;
    }

    // User is logged in, proceed to checkout
    await proceedToCheckout(userData?.email);
  };

  const handleAuthenticatedDownload = async () => {
    if (!generatedImageUrl) {
      setError('No image available to download');
      return;
    }

    if (!userData || userData.credits < 1) {
      setError('Insufficient credits');
      setShowPricingPopup(true);
      return;
    }

    try {
      // First, save image and deduct credit via API
      const saveResponse = await fetch('/api/save-download', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          email: userData.email,
          imageUrl: generatedImageUrl,
          plan: 'credit',
        }),
      });

      if (!saveResponse.ok) {
        setError('Failed to process download');
        return;
      }

      // Update local credits immediately
      const newCredits = userData.credits - 1;
      setUserData({ ...userData, credits: newCredits });

      // Also update in database
      await fetch('/api/user/account', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify({
          credits: newCredits
        }),
      });

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
      
      // Update local user data
      setUserData({ ...userData, credits: userData.credits - 1 });
      
      // Refresh account data to get updated image list
      if (authToken) {
        fetchUserAccount(authToken);
      }
      
      console.log('Download completed, credit deducted');
    } catch (err) {
      console.error('Download error:', err);
      setError('Failed to download image');
    }
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
      const headers = {
        'Content-Type': 'application/json',
      };
      
      if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
      }
      
      const saveResponse = await fetch('/api/save-download', {
        method: 'POST',
        headers,
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
      <header className="w-full py-4 px-4 md:px-6 bg-slate-950/50 backdrop-blur-md border-b border-slate-700/50">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <button 
            onClick={() => setCurrentPage('home')}
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
          >
            <Sparkles className="w-5 h-5 text-cyan-400" />
            <span className="font-semibold text-white text-sm md:text-base">BetterSelfie AI</span>
          </button>
          
          {/* Desktop Navigation */}
          <nav className="hidden md:flex gap-6 text-sm text-slate-400 items-center">
            {isLoggedIn && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-800/50 border border-cyan-500/30 rounded-lg">
                <Sparkles className="w-4 h-4 text-cyan-400" />
                <span className="text-white font-semibold">{userData?.credits || 0}</span>
                <span className="text-slate-400 text-xs">credits</span>
              </div>
            )}
            <button onClick={() => setCurrentPage('pricing')} className="hover:text-cyan-400 transition-colors">Pricing</button>
            <button onClick={() => setCurrentPage('about')} className="hover:text-cyan-400 transition-colors">About</button>
            {!isLoggedIn ? (
              <button 
                onClick={() => setCurrentPage('login')} 
                className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white px-4 py-2 rounded-lg transition-all duration-300 font-semibold"
              >
                Sign Up / Login
              </button>
            ) : (
              <>
                <button 
                  onClick={() => {
                    setCurrentPage('account');
                    fetchUserAccount(authToken);
                  }} 
                  className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white px-4 py-2 rounded-lg transition-all duration-300 font-semibold"
                >
                  Account
                </button>
                <button 
                  onClick={() => {
                    localStorage.removeItem('authToken');
                    setAuthToken(null);
                    setUserData(null);
                    setIsLoggedIn(false);
                    setCurrentPage('home');
                  }} 
                  className="hover:text-cyan-400 transition-colors"
                >
                  Logout
                </button>
              </>
            )}
          </nav>

          {/* Mobile Navigation */}
          <div className="flex md:hidden items-center gap-3">
            {isLoggedIn && (
              <div className="flex items-center gap-1.5 px-2 py-1 bg-slate-800/50 border border-cyan-500/30 rounded-lg">
                <Sparkles className="w-3 h-3 text-cyan-400" />
                <span className="text-white font-semibold text-sm">{userData?.credits || 0}</span>
              </div>
            )}
            <button 
              onClick={() => setShowMobileMenu(!showMobileMenu)}
              className="p-2 text-white hover:text-cyan-400 transition-colors"
            >
              {showMobileMenu ? <X className="w-6 h-6" /> : <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>}
            </button>
          </div>
        </div>
        
        {/* Mobile Menu Dropdown */}
        {showMobileMenu && (
          <div className="md:hidden mt-4 pb-4 border-t border-slate-700/50 pt-4">
            <nav className="flex flex-col gap-3">
              <button onClick={() => { setCurrentPage('pricing'); setShowMobileMenu(false); }} className="text-left text-slate-400 hover:text-cyan-400 transition-colors py-2">Pricing</button>
              <button onClick={() => { setCurrentPage('about'); setShowMobileMenu(false); }} className="text-left text-slate-400 hover:text-cyan-400 transition-colors py-2">About</button>
              {!isLoggedIn ? (
                <button 
                  onClick={() => { setCurrentPage('login'); setShowMobileMenu(false); }} 
                  className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white px-4 py-2 rounded-lg transition-all duration-300 font-semibold text-center"
                >
                  Sign Up / Login
                </button>
              ) : (
                <>
                  <button 
                    onClick={() => {
                      setCurrentPage('account');
                      fetchUserAccount(authToken);
                      setShowMobileMenu(false);
                    }} 
                    className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white px-4 py-2 rounded-lg transition-all duration-300 font-semibold text-center"
                  >
                    Account
                  </button>
                  <button 
                    onClick={() => {
                      localStorage.removeItem('authToken');
                      setAuthToken(null);
                      setUserData(null);
                      setIsLoggedIn(false);
                      setCurrentPage('home');
                      setShowMobileMenu(false);
                    }} 
                    className="text-left text-slate-400 hover:text-cyan-400 transition-colors py-2"
                  >
                    Logout
                  </button>
                </>
              )}
            </nav>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-1 w-full">
        {currentPage === 'home' && (
        <div className="max-w-6xl mx-auto px-6 py-12">
          {/* Title */}
          <div className="text-center mb-16">
            <h1 className="text-5xl md:text-6xl font-bold text-white mb-4">
              Stand out with photos that
              <br />
              <span className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">showcase your best self</span>
            </h1>
            <p className="text-lg text-slate-300 max-w-2xl mx-auto">
            Transform your social media presence with professionally enhanced pictures
            </p>
          </div>

          {/* Overlapping Polaroid Style Images - Carousel on Mobile, Grid on Desktop */}
          <div className="mb-16">
            {/* Mobile Carousel */}
            <div className="md:hidden relative">
              <div className="flex justify-center items-center min-h-[320px]">
                <div className="relative w-full max-w-xs h-80">
                  {/* Before Polaroid - Rotated Left */}
                  <div className={`absolute left-0 top-0 w-56 h-80 bg-white p-3 pb-14 shadow-2xl rotate-[-12deg] transition-all duration-1000 ${swapPolaroids ? 'z-20' : 'z-10'}`}>
                    <div className="relative w-full h-52 overflow-hidden bg-slate-300">
                      <img
                        src={beforeAfterPairs[currentImageIndex].before}
                        alt="Before"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="mt-3 text-center">
                      <p className="text-xs font-handwriting text-slate-800">BEFORE</p>
                      <p className="text-xs font-semibold text-slate-600 mt-1">{beforeAfterPairs[currentImageIndex].label}</p>
                    </div>
                  </div>

                  {/* After Polaroid - Rotated Right */}
                  <div className={`absolute right-0 top-6 w-56 h-80 bg-white p-3 pb-14 shadow-2xl rotate-[10deg] transition-all duration-1000 ${swapPolaroids ? 'z-10' : 'z-20'}`}>
                    <div className="relative w-full h-52 overflow-hidden bg-slate-300">
                      <img
                        src={beforeAfterPairs[currentImageIndex].after}
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
              
              {/* Carousel Navigation */}
              <div className="flex justify-center items-center gap-4 mt-6">
                <button
                  onClick={() => setCurrentImageIndex((prev) => (prev === 0 ? beforeAfterPairs.length - 1 : prev - 1))}
                  className="p-2 bg-slate-700 hover:bg-slate-600 rounded-full transition-colors"
                >
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <div className="flex gap-2">
                  {beforeAfterPairs.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => setCurrentImageIndex(index)}
                      className={`w-2 h-2 rounded-full transition-all ${
                        index === currentImageIndex ? 'bg-cyan-500 w-6' : 'bg-slate-600'
                      }`}
                    />
                  ))}
                </div>
                <button
                  onClick={() => setCurrentImageIndex((prev) => (prev === beforeAfterPairs.length - 1 ? 0 : prev + 1))}
                  className="p-2 bg-slate-700 hover:bg-slate-600 rounded-full transition-colors"
                >
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Desktop Grid */}
            <div className="hidden md:grid grid-cols-2 lg:grid-cols-3 gap-12 max-w-6xl mx-auto">
              {beforeAfterPairs.map((pair, index) => (
                <div key={index} className="flex justify-center items-center">
                  <div className="relative w-full max-w-xs h-80">
                    {/* Before Polaroid - Rotated Left */}
                    <div className={`absolute left-0 top-0 w-56 h-80 bg-white p-3 pb-14 shadow-2xl rotate-[-12deg] hover:rotate-[-4deg] transition-all duration-1000 hover:scale-105 hover:z-30 ${swapPolaroids ? 'z-20' : 'z-10'}`}>
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
                    <div className={`absolute right-0 top-6 w-56 h-80 bg-white p-3 pb-14 shadow-2xl rotate-[10deg] hover:rotate-[4deg] transition-all duration-1000 hover:scale-105 hover:z-30 ${swapPolaroids ? 'z-10' : 'z-20'}`}>
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
                                  src={watermarkedPreview || generatedImageUrl}
                                  alt="Enhanced"
                                  className="w-full h-full object-cover"
                                  style={{ pointerEvents: 'none', userSelect: 'none' }}
                                  onContextMenu={(e) => e.preventDefault()}
                                  draggable="false"
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
              <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-3xl p-4 md:p-8 border border-cyan-500/30 shadow-2xl max-w-4xl w-full relative max-h-[90vh] overflow-y-auto">
                <button
                  onClick={() => setShowPricingPopup(false)}
                  className="absolute top-4 right-4 p-2 bg-slate-700 hover:bg-slate-600 text-white rounded-full shadow-lg transition-colors duration-200 z-10"
                >
                  <X className="w-5 h-5" />
                </button>
                
                <div className="text-center mb-6 md:mb-8">
                  <h3 className="text-2xl md:text-3xl font-bold text-white mb-2">
                    Choose Your Plan
                  </h3>
                  <p className="text-sm md:text-base text-slate-300">
                    Select the perfect plan for your needs
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 mb-6 md:mb-8">
                  {/* Single Image Plan */}
                  <div 
                    onClick={() => setSelectedPlan('single')}
                    className={`bg-slate-800/50 rounded-2xl p-4 md:p-6 border-2 transition-all cursor-pointer active:scale-95 md:hover:scale-105 ${
                      selectedPlan === 'single' ? 'border-cyan-500 shadow-lg shadow-cyan-500/20' : 'border-slate-700/50'
                    }`}
                  >
                    <div className="text-center">
                      <p className="text-slate-400 text-xs md:text-sm uppercase tracking-widest mb-2">Single Image</p>
                      <div className="mb-3 md:mb-4">
                        <span className="text-3xl md:text-4xl font-bold text-white">€3.99</span>
                      </div>
                      <ul className="text-left space-y-1.5 md:space-y-2 text-slate-300 text-xs md:text-sm">
                        <li className="flex items-center gap-2">
                          <span className="text-cyan-400">✓</span>
                          1 Image Credit
                        </li>
                        <li className="flex items-center gap-2">
                          <span className="text-cyan-400">✓</span>
                          AI Enhancement
                        </li>
                        <li className="flex items-center gap-2">
                          <span className="text-cyan-400">✓</span>
                          High Quality
                        </li>
                      </ul>
                    </div>
                  </div>

                  {/* 3 Images Plan */}
                  <div 
                    onClick={() => setSelectedPlan('triple')}
                    className={`bg-slate-800/50 rounded-2xl p-4 md:p-6 border-2 transition-all cursor-pointer active:scale-95 md:hover:scale-105 relative ${
                      selectedPlan === 'triple' ? 'border-cyan-500 shadow-lg shadow-cyan-500/20' : 'border-slate-700/50'
                    }`}
                  >
                    <div className="absolute -top-2 right-2 md:-top-3 md:right-4 bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-[10px] md:text-xs font-bold px-2 md:px-3 py-0.5 md:py-1 rounded-full">
                      POPULAR
                    </div>
                    <div className="text-center">
                      <p className="text-slate-400 text-xs md:text-sm uppercase tracking-widest mb-2">3 Images Bundle</p>
                      <div className="mb-3 md:mb-4">
                        <span className="text-3xl md:text-4xl font-bold text-white">€9.99</span>
                      </div>
                      <ul className="text-left space-y-1.5 md:space-y-2 text-slate-300 text-xs md:text-sm">
                        <li className="flex items-center gap-2">
                          <span className="text-cyan-400">✓</span>
                          3 Image Credits
                        </li>
                        <li className="flex items-center gap-2">
                          <span className="text-cyan-400">✓</span>
                          AI Enhancement
                        </li>
                        <li className="flex items-center gap-2">
                          <span className="text-cyan-400">✓</span>
                          Save €2.00
                        </li>
                      </ul>
                    </div>
                  </div>

                  {/* 10 Images Plan */}
                  <div 
                    onClick={() => setSelectedPlan('premium')}
                    className={`bg-slate-800/50 rounded-2xl p-4 md:p-6 border-2 transition-all cursor-pointer active:scale-95 md:hover:scale-105 relative ${
                      selectedPlan === 'premium' ? 'border-cyan-500 shadow-lg shadow-cyan-500/20' : 'border-slate-700/50'
                    }`}
                  >
                    <div className="absolute -top-2 right-2 md:-top-3 md:right-4 bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-[10px] md:text-xs font-bold px-2 md:px-3 py-0.5 md:py-1 rounded-full">
                      BEST VALUE
                    </div>
                    <div className="text-center">
                      <p className="text-slate-400 text-xs md:text-sm uppercase tracking-widest mb-2">10 Images Bundle</p>
                      <div className="mb-3 md:mb-4">
                        <span className="text-3xl md:text-4xl font-bold text-white">€25.00</span>
                      </div>
                      <ul className="text-left space-y-1.5 md:space-y-2 text-slate-300 text-xs md:text-sm">
                        <li className="flex items-center gap-2">
                          <span className="text-cyan-400">✓</span>
                          10 Image Credits
                        </li>
                        <li className="flex items-center gap-2">
                          <span className="text-cyan-400">✓</span>
                          AI Enhancement
                        </li>
                        <li className="flex items-center gap-2">
                          <span className="text-cyan-400">✓</span>
                          Save €14.90
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
                  {isLoggedIn ? 'Purchase Credits' : 'Continue to Checkout'}
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

          {/* Auth Popup (Login/Signup) */}
          {showAuthPopup && (
            <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-3xl p-8 border border-cyan-500/30 shadow-2xl max-w-md w-full relative max-h-[90vh] overflow-y-auto">
                <button
                  onClick={() => setShowAuthPopup(false)}
                  className="absolute top-4 right-4 p-2 bg-slate-700 hover:bg-slate-600 text-white rounded-full shadow-lg transition-colors duration-200 z-10"
                >
                  <X className="w-5 h-5" />
                </button>
                
                <div className="text-center mb-8">
                  <h3 className="text-3xl font-bold text-white mb-2">
                    {authMode === 'login' ? 'Welcome Back' : 'Create Account'}
                  </h3>
                  <p className="text-slate-300">
                    {authMode === 'login' ? 'Sign in to continue with your purchase' : 'Sign up to continue with your purchase'}
                  </p>
                </div>

                {error && (
                  <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-300 text-sm">
                    {error}
                  </div>
                )}

                {authMode === 'login' ? (
                  <>
                    <div className="space-y-4 mb-6">
                      <div>
                        <label className="block text-slate-300 text-sm font-semibold mb-2">
                          Email or Username
                        </label>
                        <input
                          type="text"
                          value={loginEmail}
                          onChange={(e) => setLoginEmail(e.target.value)}
                          placeholder="Enter your email or username"
                          className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                        />
                      </div>

                      <div>
                        <label className="block text-slate-300 text-sm font-semibold mb-2">
                          Password
                        </label>
                        <input
                          type="password"
                          value={loginPassword}
                          onChange={(e) => setLoginPassword(e.target.value)}
                          placeholder="Enter your password"
                          className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                        />
                      </div>
                    </div>

                    <Button
                      onClick={async () => {
                        if (!loginEmail || !loginPassword) {
                          setError('Please fill in all fields');
                          return;
                        }
                        
                        try {
                          const response = await fetch('/api/auth/login', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              emailOrUsername: loginEmail,
                              password: loginPassword
                            })
                          });

                          const data = await response.json();

                          if (response.ok) {
                            localStorage.setItem('authToken', data.token);
                            setAuthToken(data.token);
                            setIsLoggedIn(true);
                            setError(null);
                            setLoginEmail('');
                            setLoginPassword('');
                            await handleAuthSuccess(data.token);
                          } else {
                            setError(data.error || 'Login failed');
                          }
                        } catch (error) {
                          setError('Failed to connect to server');
                        }
                      }}
                      className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-semibold py-3 rounded-xl transition-all duration-300 shadow-lg mb-4"
                    >
                      Sign In
                    </Button>
                  </>
                ) : (
                  <>
                    <div className="space-y-4 mb-6">
                      <div>
                        <label className="block text-slate-300 text-sm font-semibold mb-2">
                          Username
                        </label>
                        <input
                          type="text"
                          value={username}
                          onChange={(e) => setUsername(e.target.value)}
                          placeholder="Choose a username"
                          className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                        />
                      </div>

                      <div>
                        <label className="block text-slate-300 text-sm font-semibold mb-2">
                          Email
                        </label>
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="your.email@example.com"
                          className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                        />
                      </div>

                      <div>
                        <label className="block text-slate-300 text-sm font-semibold mb-2">
                          Password
                        </label>
                        <input
                          type="password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Create a password"
                          className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                        />
                      </div>

                      <div>
                        <label className="block text-slate-300 text-sm font-semibold mb-2">
                          Confirm Password
                        </label>
                        <input
                          type="password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="Confirm your password"
                          className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                        />
                      </div>
                    </div>

                    <Button
                      onClick={async () => {
                        if (!username || !email || !password || !confirmPassword) {
                          setError('Please fill in all fields');
                          return;
                        }
                        if (!email.includes('@')) {
                          setError('Please enter a valid email address');
                          return;
                        }
                        if (password !== confirmPassword) {
                          setError('Passwords do not match');
                          return;
                        }
                        if (password.length < 6) {
                          setError('Password must be at least 6 characters long');
                          return;
                        }
                        
                        try {
                          const response = await fetch('/api/auth/signup', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ username, email, password })
                          });

                          const data = await response.json();

                          if (response.ok) {
                            localStorage.setItem('authToken', data.token);
                            setAuthToken(data.token);
                            setIsLoggedIn(true);
                            setError(null);
                            setUsername('');
                            setEmail('');
                            setPassword('');
                            setConfirmPassword('');
                            await handleAuthSuccess(data.token);
                          } else {
                            setError(data.error || 'Signup failed');
                          }
                        } catch (error) {
                          setError('Failed to connect to server');
                        }
                      }}
                      className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-semibold py-3 rounded-xl transition-all duration-300 shadow-lg mb-4"
                    >
                      Sign Up
                    </Button>
                  </>
                )}

                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-slate-600"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-slate-800 text-slate-400">Or continue with</span>
                  </div>
                </div>

                <button
                  onClick={() => signIn('google', { callbackUrl: '/' })}
                  className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-white hover:bg-gray-50 text-gray-800 font-semibold rounded-xl transition-all duration-300 shadow-lg mb-4"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Continue with Google
                </button>

                <div className="text-center">
                  <p className="text-slate-400 text-sm">
                    {authMode === 'login' ? "Don't have an account?" : "Already have an account?"}{' '}
                    <button
                      onClick={() => {
                        setAuthMode(authMode === 'login' ? 'signup' : 'login');
                        setError(null);
                      }}
                      className="text-cyan-400 hover:text-cyan-300 font-semibold transition-colors"
                    >
                      {authMode === 'login' ? 'Sign Up' : 'Sign In'}
                    </button>
                  </p>
                </div>
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
            
            {/* Flex Masonry Layout - Single column on mobile, three columns on desktop */}
            <div className="flex flex-col md:flex-row gap-6 max-w-6xl mx-auto justify-center px-4">
              {/* Column 1: Small, Large, Medium, Small */}
              <div className="flex flex-col gap-6 w-full lg:w-[calc(33.333%-16px)]">
                {/* Card 1 - Small (h-72) */}
                <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl overflow-hidden border border-slate-700/50 hover:border-cyan-500/50 transition-colors duration-300 flex flex-col h-72">
                  <div className="h-40 bg-gradient-to-br from-cyan-500 to-blue-600 relative overflow-hidden flex-shrink-0">
                    <img src="https://i.pravatar.cc/400?img=1" alt="Before" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/20 flex items-end p-4">
                      <div><p className="text-white font-semibold">Sarah M.</p><p className="text-cyan-200 text-sm">3 matches in 24h</p></div>
                    </div>
                  </div>
                  <div className="p-4 flex-grow flex flex-col justify-between">
                    <p className="text-slate-300 text-sm">"The quality is incredible! My photos look so much better!"</p>
                    <div className="flex gap-1 mt-2">{[...Array(4)].map((_, i) => <span key={i} className="text-yellow-400 text-sm">★</span>)}<span className="text-yellow-400 text-sm">☆</span></div>
                  </div>
                </div>

                {/* Card 2 - Large (h-96) */}
                <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl overflow-hidden border border-slate-700/50 hover:border-cyan-500/50 transition-colors duration-300 flex flex-col h-96">
                  <div className="h-56 bg-gradient-to-br from-orange-500 to-red-600 relative overflow-hidden flex-shrink-0">
                    <img src="https://i.pravatar.cc/400?img=12" alt="Amazing" className="w-full h-full object-cover" />
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
                    <img src="https://i.pravatar.cc/400?img=5" alt="Success" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/20 flex items-end p-4">
                      <div><p className="text-white font-semibold">Jessica K.</p><p className="text-purple-200 text-sm">7 conversations</p></div>
                    </div>
                  </div>
                  <div className="p-4 flex-grow flex flex-col justify-between">
                    <p className="text-slate-300 text-sm">"Best investment for my profile! Finally getting quality matches!"</p>
                    <div className="flex gap-1 mt-2">{[...Array(4)].map((_, i) => <span key={i} className="text-yellow-400 text-sm">★</span>)}<span className="text-yellow-400 text-sm">☆</span></div>
                  </div>
                </div>

                {/* Card 4 - Small (h-72) */}
                <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl overflow-hidden border border-slate-700/50 hover:border-cyan-500/50 transition-colors duration-300 flex flex-col h-72">
                  <div className="h-40 bg-gradient-to-br from-emerald-500 to-teal-600 relative overflow-hidden flex-shrink-0">
                    <img src="https://i.pravatar.cc/400?img=13" alt="Result" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/20 flex items-end p-4">
                      <div><p className="text-white font-semibold">Marcus L.</p><p className="text-teal-200 text-sm">6 matches</p></div>
                    </div>
                  </div>
                  <div className="p-4 flex-grow flex flex-col justify-between">
                    <p className="text-slate-300 text-sm">"Seriously impressed with the enhancement quality!"</p>
                    <div className="flex gap-1 mt-2">{[...Array(3)].map((_, i) => <span key={i} className="text-yellow-400 text-sm">★</span>)}{[...Array(2)].map((_, i) => <span key={i} className="text-yellow-400 text-sm">☆</span>)}</div>
                  </div>
                </div>
              </div>

              {/* Column 2: Large, Small, Small, Medium */}
              <div className="hidden md:flex flex-col gap-6 w-full lg:w-[calc(33.333%-16px)]">
                {/* Card 5 - Large (h-96) */}
                <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl overflow-hidden border border-slate-700/50 hover:border-cyan-500/50 transition-colors duration-300 flex flex-col h-96">
                  <div className="h-56 bg-gradient-to-br from-pink-500 to-rose-600 relative overflow-hidden flex-shrink-0">
                    <img src="https://i.pravatar.cc/400?img=9" alt="Transformed" className="w-full h-full object-cover" />
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
                    <img src="https://i.pravatar.cc/400?img=15" alt="Incredible" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/20 flex items-end p-4">
                      <div><p className="text-white font-semibold">Chris P.</p><p className="text-yellow-200 text-sm">8 matches in 2 days</p></div>
                    </div>
                  </div>
                  <div className="p-4 flex-grow flex flex-col justify-between">
                    <p className="text-slate-300 text-sm">"Absolutely love the results! My profile looks amazing!"</p>
                    <div className="flex gap-1 mt-2">{[...Array(4)].map((_, i) => <span key={i} className="text-yellow-400 text-sm">★</span>)}<span className="text-yellow-400 text-sm">☆</span></div>
                  </div>
                </div>

                {/* Card 7 - Small (h-72) */}
                <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl overflow-hidden border border-slate-700/50 hover:border-cyan-500/50 transition-colors duration-300 flex flex-col h-72">
                  <div className="h-40 bg-gradient-to-br from-red-500 to-pink-600 relative overflow-hidden flex-shrink-0">
                    <img src="https://i.pravatar.cc/400?img=20" alt="Stunning" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/20 flex items-end p-4">
                      <div><p className="text-white font-semibold">Taylor R.</p><p className="text-pink-200 text-sm">4 new matches</p></div>
                    </div>
                  </div>
                  <div className="p-4 flex-grow flex flex-col justify-between">
                    <p className="text-slate-300 text-sm">"Worth every penny for the quality!"</p>
                    <div className="flex gap-1 mt-2">{[...Array(4)].map((_, i) => <span key={i} className="text-yellow-400 text-sm">★</span>)}<span className="text-yellow-400 text-sm">☆</span></div>
                  </div>
                </div>

                {/* Card 8 - Medium (h-80) */}
                <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl overflow-hidden border border-slate-700/50 hover:border-cyan-500/50 transition-colors duration-300 flex flex-col h-80">
                  <div className="h-48 bg-gradient-to-br from-blue-500 to-cyan-600 relative overflow-hidden flex-shrink-0">
                    <img src="https://i.pravatar.cc/400?img=33" alt="Success" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/20 flex items-end p-4">
                      <div><p className="text-white font-semibold">Jordan K.</p><p className="text-cyan-200 text-sm">9 conversations</p></div>
                    </div>
                  </div>
                  <div className="p-4 flex-grow flex flex-col justify-between">
                    <p className="text-slate-300 text-sm">"The transformation is unreal! Highly recommended!"</p>
                    <div className="flex gap-1 mt-2">{[...Array(4)].map((_, i) => <span key={i} className="text-yellow-400 text-sm">★</span>)}<span className="text-yellow-400 text-sm">☆</span></div>
                  </div>
                </div>
              </div>

              {/* Column 3: Medium, Small, Large, Small */}
              <div className="hidden lg:flex flex-col gap-6 w-full lg:w-[calc(33.333%-16px)]">
                {/* Card 9 - Medium (h-80) */}
                <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl overflow-hidden border border-slate-700/50 hover:border-cyan-500/50 transition-colors duration-300 flex flex-col h-80">
                  <div className="h-48 bg-gradient-to-br from-violet-500 to-purple-600 relative overflow-hidden flex-shrink-0">
                    <img src="https://i.pravatar.cc/400?img=47" alt="Stunning" className="w-full h-full object-cover" />
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
                    <img src="https://i.pravatar.cc/400?img=51" alt="Result" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/20 flex items-end p-4">
                      <div><p className="text-white font-semibold">Morgan R.</p><p className="text-indigo-200 text-sm">5 matches</p></div>
                    </div>
                  </div>
                  <div className="p-4 flex-grow flex flex-col justify-between">
                    <p className="text-slate-300 text-sm">"Super happy with my enhanced photos!"</p>
                    <div className="flex gap-1 mt-2">{[...Array(3)].map((_, i) => <span key={i} className="text-yellow-400 text-sm">★</span>)}{[...Array(2)].map((_, i) => <span key={i} className="text-yellow-400 text-sm">☆</span>)}</div>
                  </div>
                </div>

                {/* Card 11 - Large (h-96) */}
                <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl overflow-hidden border border-slate-700/50 hover:border-cyan-500/50 transition-colors duration-300 flex flex-col h-96">
                  <div className="h-56 bg-gradient-to-br from-lime-500 to-green-600 relative overflow-hidden flex-shrink-0">
                    <img src="https://i.pravatar.cc/400?img=26" alt="Success" className="w-full h-full object-cover" />
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
                    <img src="https://i.pravatar.cc/400?img=32" alt="Amazing" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/20 flex items-end p-4">
                      <div><p className="text-white font-semibold">Riley P.</p><p className="text-rose-200 text-sm">7 matches</p></div>
                    </div>
                  </div>
                  <div className="p-4 flex-grow flex flex-col justify-between">
                    <p className="text-slate-300 text-sm">"One of the best purchases I've made!"</p>
                    <div className="flex gap-1 mt-2">{[...Array(4)].map((_, i) => <span key={i} className="text-yellow-400 text-sm">★</span>)}<span className="text-yellow-400 text-sm">☆</span></div>
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

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
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
                    onClick={() => handlePricingPagePurchase('single')}
                    className="w-full bg-slate-700 hover:bg-slate-600 text-white font-semibold py-3 rounded-xl transition-all duration-300"
                  >
                    Purchase Now
                  </Button>
                </div>
              </div>

              {/* 3 Images Plan */}
              <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-3xl p-8 border border-slate-700/50 hover:border-cyan-500/30 transition-all duration-300 hover:scale-105 relative">
                <div className="absolute -top-3 right-4 bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-xs font-bold px-3 py-1 rounded-full">
                  POPULAR
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
                    onClick={() => handlePricingPagePurchase('triple')}
                    className="w-full bg-slate-700 hover:bg-slate-600 text-white font-semibold py-3 rounded-xl transition-all duration-300"
                  >
                    Purchase Now
                  </Button>
                </div>
              </div>

              {/* 10 Images Plan */}
              <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-3xl p-8 border border-cyan-500/30 hover:border-cyan-500/50 transition-all duration-300 hover:scale-105 relative">
                <div className="absolute -top-3 right-4 bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-xs font-bold px-3 py-1 rounded-full">
                  BEST VALUE
                </div>
                <div className="text-center">
                  <p className="text-slate-400 text-sm uppercase tracking-widest mb-4">10 Images Bundle</p>
                  <div className="mb-6">
                    <span className="text-5xl font-bold text-white">€25.00</span>
                  </div>
                  <ul className="text-left space-y-3 mb-8 text-slate-300">
                    <li className="flex items-center gap-2">
                      <span className="text-cyan-400">✓</span>
                      10 Image Credits
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
                      Save €14.90
                    </li>
                  </ul>
                  <Button
                    onClick={() => handlePricingPagePurchase('premium')}
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
                About <span className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">BetterSelfie AI</span>
              </h1>
              <p className="text-lg text-slate-300">Transforming your photos with cutting-edge AI technology</p>
            </div>

            <div className="space-y-8">
              <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-8 border border-slate-700/50">
                <h2 className="text-2xl font-bold text-white mb-4">Our Mission</h2>
                <p className="text-slate-300 leading-relaxed">
                  At BetterSelfie AI, we believe everyone deserves to present their best self online. Our advanced AI technology enhances your photos while maintaining their natural authenticity, helping you elevate your social media presence and make a lasting impression.
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

        {/* Login Page */}
        {currentPage === 'login' && (
          <div className="max-w-md mx-auto px-6 py-12">
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-3xl p-8 border border-slate-700/50 shadow-2xl">
              <div className="text-center mb-8">
                <h1 className="text-4xl font-bold text-white mb-2">
                  Welcome <span className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">Back</span>
                </h1>
                <p className="text-slate-300">Sign in to your account</p>
              </div>

              {error && (
                <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-300 text-sm">
                  {error}
                </div>
              )}

              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-slate-300 text-sm font-semibold mb-2">
                    Email or Username
                  </label>
                  <input
                    type="text"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder="Enter your email or username"
                    className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 text-sm font-semibold mb-2">
                    Password
                  </label>
                  <input
                    type="password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                  />
                </div>
              </div>

              <Button
                onClick={async () => {
                  if (!loginEmail || !loginPassword) {
                    setError('Please fill in all fields');
                    return;
                  }
                  
                  try {
                    const response = await fetch('/api/auth/login', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        emailOrUsername: loginEmail,
                        password: loginPassword
                      })
                    });

                    const data = await response.json();

                    if (response.ok) {
                      localStorage.setItem('authToken', data.token);
                      setAuthToken(data.token);
                      setUserData(data.user);
                      setIsLoggedIn(true);
                      setCurrentPage('home');
                      setError(null);
                      setLoginEmail('');
                      setLoginPassword('');
                    } else {
                      setError(data.error || 'Login failed');
                    }
                  } catch (error) {
                    setError('Failed to connect to server');
                  }
                }}
                className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-semibold py-3 rounded-xl transition-all duration-300 shadow-lg mb-4"
              >
                Sign In
              </Button>

              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-600"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-slate-800 text-slate-400">Or continue with</span>
                </div>
              </div>

              <button
                onClick={() => signIn('google', { callbackUrl: '/' })}
                className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-white hover:bg-gray-50 text-gray-800 font-semibold rounded-xl transition-all duration-300 shadow-lg mb-4"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Continue with Google
              </button>

              <div className="text-center">
                <p className="text-slate-400 text-sm">
                  Don't have an account?{' '}
                  <button
                    onClick={() => {
                      setCurrentPage('signup');
                      setError(null);
                    }}
                    className="text-cyan-400 hover:text-cyan-300 font-semibold transition-colors"
                  >
                    Sign Up
                  </button>
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Signup Page */}
        {currentPage === 'signup' && (
          <div className="max-w-md mx-auto px-6 py-12">
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-3xl p-8 border border-slate-700/50 shadow-2xl">
              <div className="text-center mb-8">
                <h1 className="text-4xl font-bold text-white mb-2">
                  Create <span className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">Account</span>
                </h1>
                <p className="text-slate-300">Join us today and enhance your photos</p>
              </div>

              {error && (
                <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-300 text-sm">
                  {error}
                </div>
              )}

              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-slate-300 text-sm font-semibold mb-2">
                    Username
                  </label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Choose a username"
                    className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 text-sm font-semibold mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your.email@example.com"
                    className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 text-sm font-semibold mb-2">
                    Password
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Create a password"
                    className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 text-sm font-semibold mb-2">
                    Confirm Password
                  </label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm your password"
                    className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                  />
                </div>
              </div>

              <Button
                onClick={async () => {
                  if (!username || !email || !password || !confirmPassword) {
                    setError('Please fill in all fields');
                    return;
                  }
                  if (!email.includes('@')) {
                    setError('Please enter a valid email address');
                    return;
                  }
                  if (password !== confirmPassword) {
                    setError('Passwords do not match');
                    return;
                  }
                  if (password.length < 6) {
                    setError('Password must be at least 6 characters long');
                    return;
                  }
                  
                  try {
                    const response = await fetch('/api/auth/signup', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ username, email, password })
                    });

                    const data = await response.json();

                    if (response.ok) {
                      localStorage.setItem('authToken', data.token);
                      setAuthToken(data.token);
                      setUserData(data.user);
                      setIsLoggedIn(true);
                      setCurrentPage('home');
                      setError(null);
                      setUsername('');
                      setEmail('');
                      setPassword('');
                      setConfirmPassword('');
                    } else {
                      setError(data.error || 'Signup failed');
                    }
                  } catch (error) {
                    setError('Failed to connect to server');
                  }
                }}
                className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-semibold py-3 rounded-xl transition-all duration-300 shadow-lg mb-4"
              >
                Sign Up
              </Button>

              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-600"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-slate-800 text-slate-400">Or continue with</span>
                </div>
              </div>

              <button
                onClick={() => signIn('google', { callbackUrl: '/' })}
                className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-white hover:bg-gray-50 text-gray-800 font-semibold rounded-xl transition-all duration-300 shadow-lg mb-4"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Continue with Google
              </button>

              <div className="text-center">
                <p className="text-slate-400 text-sm">
                  Already have an account?{' '}
                  <button
                    onClick={() => {
                      setCurrentPage('login');
                      setError(null);
                    }}
                    className="text-cyan-400 hover:text-cyan-300 font-semibold transition-colors"
                  >
                    Sign In
                  </button>
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Account Page */}
        {currentPage === 'account' && userData && (
          <div className="max-w-4xl mx-auto px-6 py-12">
            {/* Account Info Section */}
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-3xl p-8 border border-slate-700/50 shadow-2xl mb-8">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h1 className="text-3xl font-bold text-white mb-2">
                    My <span className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">Account</span>
                  </h1>
                  <p className="text-slate-300">Manage your account and view your history</p>
                </div>
                {!isEditingAccount ? (
                  <Button
                    onClick={() => {
                      setIsEditingAccount(true);
                      setEditUsername(userData.username);
                      setEditEmail(userData.email);
                    }}
                    className="bg-slate-700 hover:bg-slate-600 text-white"
                  >
                    Modify
                  </Button>
                ) : (
                  <div className="flex gap-2">
                    <Button
                      onClick={async () => {
                        try {
                          const response = await fetch('/api/user/account', {
                            method: 'PUT',
                            headers: {
                              'Content-Type': 'application/json',
                              'Authorization': `Bearer ${authToken}`
                            },
                            body: JSON.stringify({
                              username: editUsername,
                              email: editEmail
                            })
                          });

                          const data = await response.json();

                          if (response.ok) {
                            setUserData({ ...userData, username: editUsername, email: editEmail });
                            setIsEditingAccount(false);
                            setError(null);
                          } else {
                            setError(data.error || 'Failed to update account');
                          }
                        } catch (error) {
                          setError('Failed to connect to server');
                        }
                      }}
                      className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white"
                    >
                      Save
                    </Button>
                    <Button
                      onClick={() => setIsEditingAccount(false)}
                      className="bg-slate-700 hover:bg-slate-600 text-white"
                    >
                      Cancel
                    </Button>
                  </div>
                )}
              </div>

              {error && (
                <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-300 text-sm">
                  {error}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <label className="block text-slate-400 text-sm font-semibold mb-2">
                    Username
                  </label>
                  {isEditingAccount ? (
                    <input
                      type="text"
                      value={editUsername}
                      onChange={(e) => setEditUsername(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    />
                  ) : (
                    <p className="text-white text-lg">{userData.username}</p>
                  )}
                </div>

                <div>
                  <label className="block text-slate-400 text-sm font-semibold mb-2">
                    Email
                  </label>
                  {isEditingAccount ? (
                    <input
                      type="email"
                      value={editEmail}
                      onChange={(e) => setEditEmail(e.target.value)}
                      className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    />
                  ) : (
                    <p className="text-white text-lg">{userData.email}</p>
                  )}
                </div>
              </div>

              <div className="bg-slate-700/30 rounded-xl p-6 border border-slate-600/50">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-slate-400 text-sm font-semibold mb-1">Credits Remaining</p>
                    <p className="text-4xl font-bold text-cyan-400">{userData.credits}</p>
                  </div>
                  <Button
                    onClick={() => setCurrentPage('pricing')}
                    className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white"
                  >
                    Buy Credits
                  </Button>
                </div>
              </div>
            </div>

            {/* Generated Images Section */}
            <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-3xl p-8 border border-slate-700/50 shadow-2xl">
              <h2 className="text-2xl font-bold text-white mb-6">
                Your Generated <span className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">Images</span>
              </h2>
              
              {userImages.length === 0 ? (
                <div className="text-center py-12">
                  <ImageIcon className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                  <p className="text-slate-400">No images generated yet</p>
                  <Button
                    onClick={() => setCurrentPage('home')}
                    className="mt-4 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white"
                  >
                    Create Your First Image
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {userImages.map((image, index) => (
                    <div key={index} className="bg-slate-700/30 rounded-xl overflow-hidden border border-slate-600/50 hover:border-cyan-500/50 transition-colors">
                      <div className="aspect-square relative">
                        <img
                          src={image.image}
                          alt={`Generated ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="p-2 flex items-center justify-between">
                        <p className="text-slate-400 text-sm">
                          {new Date(image.createdAt).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          })}
                        </p>
                        <button
                          onClick={async () => {
                            const response = await fetch(image.image);
                            const blob = await response.blob();
                            const url = window.URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = `ai-enhanced-${Date.now()}.png`;
                            document.body.appendChild(a);
                            a.click();
                            window.URL.revokeObjectURL(url);
                            document.body.removeChild(a);
                          }}
                          className="hover:opacity-70 transition-opacity"
                        >
                          <Download className="w-5 h-5 text-blue-500" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="w-full py-6 px-6 bg-slate-950/50 border-t border-slate-700/50">
        <div className="max-w-7xl mx-auto text-center text-sm text-slate-400">
          <p>© 2024 BetterSelfie AI. Powered by advanced machine learning.</p>
        </div>
      </footer>
    </div>
  );
}
