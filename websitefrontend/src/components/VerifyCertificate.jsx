import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { CheckCircle, XCircle, Award, Calendar, User, Shield, Download, ExternalLink } from 'lucide-react';

const API_URL = 'http://localhost:8000'; // Fallback

export default function VerifyCertificate() {
    const { id } = useParams();
    const [status, setStatus] = useState('loading'); // loading, valid, invalid, error
    const [cert, setCert] = useState(null);

    useEffect(() => {
        const verify = async () => {
            try {
                const res = await axios.get(`${API_URL}/certificates/verify/${id}`);
                if (res.data.is_valid) {
                    setCert(res.data.certificate);
                    setStatus('valid');
                } else {
                    setStatus('invalid');
                }
            } catch (err) {
                console.error(err);
                setStatus('error');
            }
        };
        verify();
    }, [id]);

    const tierColors = {
        bronze: 'from-amber-600 to-amber-800',
        silver: 'from-slate-400 to-slate-600',
        gold: 'from-yellow-400 to-yellow-600',
    };

    if (status === 'loading') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-600"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md mx-auto bg-white rounded-2xl shadow-xl overflow-hidden">
                <div className={`h-2 bg-gradient-to-r ${status === 'valid' ? 'from-green-500 to-emerald-600' : 'from-red-500 to-rose-600'}`}></div>
                
                <div className="p-8">
                    <div className="text-center mb-8">
                        {status === 'valid' ? (
                            <>
                                <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-100 mb-4">
                                    <CheckCircle className="w-12 h-12 text-green-600" />
                                </div>
                                <h1 className="text-2xl font-bold text-gray-900">Certificate Verified</h1>
                                <p className="text-gray-500 mt-2">This is a legitimate SevaSetu recognition document.</p>
                            </>
                        ) : (
                            <>
                                <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-red-100 mb-4">
                                    <XCircle className="w-12 h-12 text-red-600" />
                                </div>
                                <h1 className="text-2xl font-bold text-gray-900">Verification Failed</h1>
                                <p className="text-gray-500 mt-2">This certificate ID could not be validated.</p>
                            </>
                        )}
                    </div>

                    {status === 'valid' && cert && (
                        <div className="space-y-6">
                            <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${tierColors[cert.tier]} flex items-center justify-center text-white`}>
                                        <Award className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Tier Level</p>
                                        <p className="text-lg font-bold text-gray-900 capitalize">{cert.tier_label.en}</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 gap-4">
                                    <div className="flex items-start gap-3">
                                        <User className="w-5 h-5 text-gray-400 mt-0.5" />
                                        <div>
                                            <p className="text-xs text-gray-400">Awarded To</p>
                                            <p className="font-semibold text-gray-900">{cert.volunteer_name}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-3">
                                        <Calendar className="w-5 h-5 text-gray-400 mt-0.5" />
                                        <div>
                                            <p className="text-xs text-gray-400">Issue Date</p>
                                            <p className="font-semibold text-gray-900">{cert.issue_date}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-3">
                                        <Shield className="w-5 h-5 text-gray-400 mt-0.5" />
                                        <div>
                                            <p className="text-xs text-gray-400">NGO Partner</p>
                                            <p className="font-semibold text-gray-900">{cert.ngo_name}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="border-t border-gray-100 pt-6">
                                <p className="text-sm text-gray-600 leading-relaxed italic mb-2 text-center">
                                    "{cert.description.en}"
                                </p>
                                <p className="text-xs text-gray-400 text-center">
                                    {cert.description.hi}
                                </p>
                            </div>

                            <div className="flex flex-col gap-3 pt-4">
                                <button className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-all">
                                    <Download className="w-5 h-5" />
                                    Download PDF
                                </button>
                                <Link 
                                    to="/"
                                    className="w-full bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 font-semibold py-3 px-4 rounded-xl flex items-center justify-center gap-2 transition-all"
                                >
                                    Visit SevaSetu Home
                                    <ExternalLink className="w-4 h-4" />
                                </Link>
                            </div>
                        </div>
                    )}

                    {status !== 'valid' && (
                        <div className="text-center pt-4">
                            <Link 
                                to="/"
                                className="inline-block text-green-600 font-bold hover:underline"
                            >
                                Back to SevaSetu
                            </Link>
                        </div>
                    )}
                </div>

                <div className="bg-gray-50 px-8 py-4 border-t border-gray-100">
                    <p className="text-center text-[10px] text-gray-400 uppercase tracking-[0.2em] font-bold">
                        Certificate ID: {id}
                    </p>
                </div>
            </div>
        </div>
    );
}
