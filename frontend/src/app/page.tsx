'use client';

import { useState, useEffect } from 'react';
import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { injected } from 'wagmi/connectors';
import { Upload, Wallet, Building2, Coins, FileText, CheckCircle, ExternalLink } from 'lucide-react';
import { useKYCContract } from '@/hooks/useKYCContract';

export default function Home() {
  const { address, isConnected } = useAccount();
  const { connect } = useConnect();
  const { disconnect } = useDisconnect();
  const { submitKYC, hash, error: contractError, isLoading, isConfirmed } = useKYCContract();
  
  const [formData, setFormData] = useState({
    institutionName: '',
    stablecoinName: '',
    stablecoinSymbol: '',
    kycDocument: null as File | null,
  });
  
  const [error, setError] = useState<string | null>(null);
  const [progressStatus, setProgressStatus] = useState<'idle' | 'kyc-pending' | 'kyc-approved' | 'deploying' | 'deployed'>('idle');
  const [deployedContract, setDeployedContract] = useState<{name: string, symbol: string, address: string} | null>(null);
  const [waitingForConfirmation, setWaitingForConfirmation] = useState(false);

  // Watch for transaction confirmation
  useEffect(() => {
    if (waitingForConfirmation && isConfirmed) {
      setWaitingForConfirmation(false);
      setProgressStatus('kyc-pending');
      simulateProgress();
    }
  }, [isConfirmed, waitingForConfirmation]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setFormData(prev => ({
      ...prev,
      kycDocument: file
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isConnected || !address) {
      setError('Please connect your wallet first');
      return;
    }

    if (!formData.institutionName || !formData.stablecoinName || !formData.stablecoinSymbol) {
      setError('Please fill in all required fields');
      return;
    }

    if (!formData.kycDocument) {
      setError('Please upload a KYC document');
      return;
    }

    setError(null);

    try {
      console.log('Submitting KYC application:', {
        address,
        institutionName: formData.institutionName,
        stablecoinName: formData.stablecoinName,
        stablecoinSymbol: formData.stablecoinSymbol,
        kycDocument: formData.kycDocument.name
      });

      // Submit to smart contract
      await submitKYC(
        address,
        formData.institutionName,
        formData.stablecoinSymbol
      );
      
      // Set waiting state for transaction confirmation
      setWaitingForConfirmation(true);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  const simulateProgress = () => {
    // Simulate KYC approval after 4 seconds
    setTimeout(() => {
      setProgressStatus('kyc-approved');
      
      // Simulate deployment after another 4 seconds
      setTimeout(() => {
        setProgressStatus('deploying');
        
        // Simulate deployment completion after another 4 seconds
        setTimeout(() => {
          setProgressStatus('deployed');
          setDeployedContract({
            name: formData.stablecoinName,
            symbol: formData.stablecoinSymbol,
            address: '0x' + Math.random().toString(16).substr(2, 40) // Mock contract address
          });
        }, 4000);
      }, 4000);
    }, 4000);
  };

  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center mb-4">
            <img 
              src="/logo_new.png" 
              alt="StableMint Core" 
              className="h-20 w-72 mr-4"
            />
            {/* <h1 className="text-4xl font-bold text-gray-900">StableMint Core</h1> */}
          </div>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Launch your institution&apos;s stablecoin on Kadena EVM with compliance and security built-in
          </p>
        </div>

        {/* Wallet Connection */}
        <div className="max-w-md mx-auto mb-8">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center justify-center mb-4">
              <Wallet className="h-8 w-8 text-green-600 mr-2" />
              <h2 className="text-xl font-semibold">Wallet Connection</h2>
            </div>
            
            {isConnected ? (
              <div className="text-center">
                <div className="flex items-center justify-center mb-4">
                  <CheckCircle className="h-6 w-6 text-green-500 mr-2" />
                  <span className="text-green-600 font-medium">Connected</span>
                </div>
                <p className="text-sm text-gray-600 mb-4 break-all">
                  {address}
                </p>
                <button
                  onClick={() => disconnect()}
                  className="w-full bg-red-500 hover:bg-red-600 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                >
                  Disconnect
                </button>
              </div>
            ) : (
              <button
                onClick={() => connect({ connector: injected() })}
                className="w-full text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center"
                style={{ backgroundColor: '#029A52' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#027a42'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#029A52'}
              >
                <Wallet className="h-5 w-5 mr-2" />
                Connect MetaMask
              </button>
            )}
          </div>
        </div>

        {/* Main Form */}
        {isConnected && (
          <div className="max-w-2xl mx-auto">
            <div className="bg-white rounded-lg shadow-lg p-8">
              <div className="flex items-center mb-6">
                <Building2 className="h-8 w-8 text-green-600 mr-3" />
                <h2 className="text-2xl font-semibold text-gray-900">Institution Details</h2>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Institution Name */}
                <div>
                  <label htmlFor="institutionName" className="block text-sm font-medium text-gray-700 mb-2">
                    Institution Name *
                  </label>
                  <input
                    type="text"
                    id="institutionName"
                    name="institutionName"
                    value={formData.institutionName}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent"
                    style={{ '--tw-ring-color': '#029A52' } as React.CSSProperties}
                    placeholder="Enter your institution name"
                    required
                  />
                </div>

                {/* Stablecoin Name */}
                <div>
                  <label htmlFor="stablecoinName" className="block text-sm font-medium text-gray-700 mb-2">
                    Stablecoin Name *
                  </label>
                  <input
                    type="text"
                    id="stablecoinName"
                    name="stablecoinName"
                    value={formData.stablecoinName}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent"
                    style={{ '--tw-ring-color': '#029A52' } as React.CSSProperties}
                    placeholder="e.g., USD Coin, Euro Token"
                    required
                  />
                </div>

                {/* Stablecoin Symbol */}
                <div>
                  <label htmlFor="stablecoinSymbol" className="block text-sm font-medium text-gray-700 mb-2">
                    Stablecoin Symbol *
                  </label>
                  <input
                    type="text"
                    id="stablecoinSymbol"
                    name="stablecoinSymbol"
                    value={formData.stablecoinSymbol}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:border-transparent"
                    style={{ '--tw-ring-color': '#029A52' } as React.CSSProperties}
                    placeholder="e.g., USDC, EURT"
                    required
                  />
                </div>

                {/* KYC Document Upload */}
                <div>
                  <label htmlFor="kycDocument" className="block text-sm font-medium text-gray-700 mb-2">
                    KYC Document *
                  </label>
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center transition-colors"
                       style={{ '--hover-border-color': '#029A52' } as React.CSSProperties}
                       onMouseEnter={(e) => e.currentTarget.style.borderColor = '#029A52'}
                       onMouseLeave={(e) => e.currentTarget.style.borderColor = '#d1d5db'}>
                    <input
                      type="file"
                      id="kycDocument"
                      name="kycDocument"
                      onChange={handleFileChange}
                      accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                      className="hidden"
                      required
                    />
                    <label htmlFor="kycDocument" className="cursor-pointer">
                      <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-lg font-medium text-gray-700 mb-2">
                        {formData.kycDocument ? formData.kycDocument.name : 'Upload KYC Document'}
                      </p>
                      <p className="text-sm text-gray-500">
                        PDF, DOC, DOCX, JPG, PNG up to 10MB
                      </p>
                    </label>
                  </div>
                </div>

                {/* Error Message */}
                {(error || contractError) && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <p className="text-red-600 text-sm">{error || (contractError as Error)?.message || 'Transaction failed'}</p>
                  </div>
                )}

                {/* Success Message */}
                {isConfirmed && hash && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-center mb-2">
                      <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                      <p className="text-green-600 font-medium">Transaction Confirmed!</p>
                    </div>
                    <p className="text-green-600 text-sm break-all mb-2">
                      Transaction Hash: {hash}
                    </p>
                    <a
                      href={`https://explorer.chainweb.com/testnet/tx/${hash}`}
          target="_blank"
          rel="noopener noreferrer"
                      className="inline-flex items-center text-green-600 hover:text-green-700 text-sm"
                    >
                      View on Explorer
                      <ExternalLink className="h-4 w-4 ml-1" />
                    </a>
                  </div>
                )}

                {/* Pending Message */}
                {isLoading && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600 mr-2"></div>
                      <p className="text-blue-600 text-sm">
                        {hash ? 'Confirming transaction...' : 'Submitting transaction...'}
                      </p>
                    </div>
                  </div>
                )}

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full text-white font-medium py-4 px-6 rounded-lg transition-colors flex items-center justify-center disabled:opacity-50"
                  style={{ backgroundColor: '#029A52' }}
                  onMouseEnter={(e) => !isLoading && (e.currentTarget.style.backgroundColor = '#027a42')}
                  onMouseLeave={(e) => !isLoading && (e.currentTarget.style.backgroundColor = '#029A52')}
                >
                  {isLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                      {hash ? 'Confirming...' : 'Submitting...'}
                    </>
                  ) : (
                    <>
                      <FileText className="h-5 w-5 mr-2" />
                      Submit KYC Application
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Progress Bar */}
        {progressStatus !== 'idle' && (
          <div className="max-w-2xl mx-auto mt-8">
            <div className="bg-white rounded-lg shadow-lg p-8">
              <h3 className="text-2xl font-semibold text-gray-900 mb-6 text-center">
                Stablecoin Launch Progress
              </h3>
              
              <div className="space-y-6">
                {/* Step 1: KYC Pending */}
                <div className="flex items-center transition-all duration-1000 ease-in-out">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-4 transition-all duration-1000 ease-in-out ${
                    progressStatus === 'kyc-pending' ? 'bg-yellow-100 scale-110' : 
                    progressStatus === 'kyc-approved' || progressStatus === 'deploying' || progressStatus === 'deployed' ? 'bg-green-100 scale-110' : 'bg-gray-100'
                  }`}>
                    {progressStatus === 'kyc-pending' ? (
                      <div className="animate-spin-slow rounded-full h-4 w-4 border-b-2 border-yellow-600 transition-all duration-500"></div>
                    ) : progressStatus === 'kyc-approved' || progressStatus === 'deploying' || progressStatus === 'deployed' ? (
                      <CheckCircle className="h-5 w-5 text-green-600 animate-pulse" />
                    ) : (
                      <div className="w-4 h-4 bg-gray-400 rounded-full transition-all duration-500"></div>
                    )}
                  </div>
                  <div className="flex-1">
                    <p className={`font-medium transition-all duration-1000 ease-in-out ${
                      progressStatus === 'kyc-pending' ? 'text-yellow-600' : 
                      progressStatus === 'kyc-approved' || progressStatus === 'deploying' || progressStatus === 'deployed' ? 'text-green-600' : 'text-gray-500'
                    }`}>
                      {progressStatus === 'kyc-pending' ? 'KYC Pending...' : 'KYC Approved ✓'}
                    </p>
                    <p className="text-sm text-gray-500 transition-all duration-1000 ease-in-out">
                      {progressStatus === 'kyc-pending' ? 'Waiting for KYC approval...' : 'Your KYC has been approved'}
                    </p>
                  </div>
                </div>

                {/* Step 2: Deploying */}
                <div className="flex items-center transition-all duration-1000 ease-in-out">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-4 transition-all duration-1000 ease-in-out ${
                    progressStatus === 'deploying' ? 'bg-blue-100 scale-110' : 
                    progressStatus === 'deployed' ? 'bg-green-100 scale-110' : 'bg-gray-100'
                  }`}>
                    {progressStatus === 'deploying' ? (
                      <div className="animate-spin-slow rounded-full h-4 w-4 border-b-2 border-blue-600 transition-all duration-500"></div>
                    ) : progressStatus === 'deployed' ? (
                      <CheckCircle className="h-5 w-5 text-green-600 animate-pulse" />
                    ) : (
                      <div className="w-4 h-4 bg-gray-400 rounded-full transition-all duration-500"></div>
                    )}
                  </div>
                  <div className="flex-1">
                    <p className={`font-medium transition-all duration-1000 ease-in-out ${
                      progressStatus === 'deploying' ? 'text-blue-600' : 
                      progressStatus === 'deployed' ? 'text-green-600' : 'text-gray-500'
                    }`}>
                      {progressStatus === 'deploying' ? 'Deploying Stablecoin...' : 
                       progressStatus === 'deployed' ? 'Stablecoin Deployed ✓' : 'Deploying Stablecoin'}
                    </p>
                    <p className="text-sm text-gray-500 transition-all duration-1000 ease-in-out">
                      {progressStatus === 'deploying' ? 'Creating your stablecoin contract...' : 
                       progressStatus === 'deployed' ? 'Your stablecoin is ready!' : 'Preparing deployment...'}
                    </p>
                  </div>
                </div>

                {/* Success Message */}
                {progressStatus === 'deployed' && deployedContract && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-6 mt-6 animate-fadeInUp transition-all duration-1000 ease-in-out">
                    <div className="flex items-center mb-4">
                      <CheckCircle className="h-6 w-6 text-green-500 mr-2 animate-bounce" />
                      <h4 className="text-lg font-semibold text-green-800">Deployment Successful!</h4>
                    </div>
                    <div className="space-y-2">
                      <p className="text-green-700">
                        <span className="font-medium">Stablecoin Name:</span> {deployedContract.name}
                      </p>
                      <p className="text-green-700">
                        <span className="font-medium">Symbol:</span> {deployedContract.symbol}
                      </p>
                      <p className="text-green-700">
                        <span className="font-medium">Contract Address:</span> 
                        <span className="font-mono text-sm break-all ml-2">{deployedContract.address}</span>
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        setProgressStatus('idle');
                        setDeployedContract(null);
                        setWaitingForConfirmation(false);
                        setFormData({
                          institutionName: '',
                          stablecoinName: '',
                          stablecoinSymbol: '',
                          kycDocument: null,
                        });
                      }}
                      className="mt-4 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                      style={{ backgroundColor: '#029A52' }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#027a42'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#029A52'}
                    >
                      Launch Another Stablecoin
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Features Section */}
        <div className="max-w-6xl mx-auto mt-16">
          <h3 className="text-2xl font-bold text-center text-gray-900 mb-12">
            Why Choose Our Stablecoin Launcher?
          </h3>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white rounded-lg shadow-lg p-6 text-center">
              <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: '#f0fdf4' }}>
                <Building2 className="h-8 w-8" style={{ color: '#029A52' }} />
              </div>
              <h4 className="text-xl font-semibold mb-2">Institution Ready</h4>
              <p className="text-gray-600">
                Built specifically for financial institutions with compliance and regulatory requirements in mind.
              </p>
            </div>
            
            <div className="bg-white rounded-lg shadow-lg p-6 text-center">
              <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: '#f0fdf4' }}>
                <Coins className="h-8 w-8" style={{ color: '#029A52' }} />
              </div>
              <h4 className="text-xl font-semibold mb-2">Kadena EVM</h4>
              <p className="text-gray-600">
                Deploy on Kadena&apos;s high-performance EVM chain with low fees and fast finality.
              </p>
            </div>
            
            <div className="bg-white rounded-lg shadow-lg p-6 text-center">
              <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: '#f0fdf4' }}>
                <FileText className="h-8 w-8" style={{ color: '#029A52' }} />
              </div>
              <h4 className="text-xl font-semibold mb-2">KYC Integration</h4>
              <p className="text-gray-600">
                Seamless KYC document submission and verification process for regulatory compliance.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}