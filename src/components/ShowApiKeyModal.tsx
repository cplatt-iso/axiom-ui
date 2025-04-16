// src/components/ShowApiKeyModal.tsx
import React, { useState, Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { ClipboardDocumentIcon, CheckCircleIcon } from '@heroicons/react/24/outline';

interface ApiKeyCreateResponse {
    id: number; name: string; prefix: string; full_key: string; // only need these
    // other fields can be omitted for this component's props
}

interface ShowApiKeyModalProps {
    isOpen: boolean;
    onClose: () => void;
    apiKeyData: ApiKeyCreateResponse;
}

const ShowApiKeyModal: React.FC<ShowApiKeyModalProps> = ({ isOpen, onClose, apiKeyData }) => {
    const [copied, setCopied] = useState(false);

    const copyToClipboard = () => {
        navigator.clipboard.writeText(apiKeyData.full_key)
            .then(() => {
                setCopied(true);
                setTimeout(() => setCopied(false), 2000); // Reset icon after 2 seconds
            })
            .catch(err => {
                console.error('Failed to copy API key: ', err);
                alert('Failed to copy key. Please copy it manually.');
            });
    };

    return (
         <Transition appear show={isOpen} as={Fragment}>
            <Dialog as="div" className="relative z-20" onClose={onClose}> {/* Higher z-index */}
                <Transition.Child
                    as={Fragment}
                    enter="ease-out duration-300" enterFrom="opacity-0" enterTo="opacity-100"
                    leave="ease-in duration-200" leaveFrom="opacity-100" leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 bg-black bg-opacity-30 dark:bg-opacity-60" />
                </Transition.Child>

                <div className="fixed inset-0 overflow-y-auto">
                    <div className="flex min-h-full items-center justify-center p-4 text-center">
                        <Transition.Child
                            as={Fragment}
                            enter="ease-out duration-300" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100"
                            leave="ease-in duration-200" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95"
                        >
                            <Dialog.Panel className="w-full max-w-xl transform overflow-hidden rounded-2xl bg-white dark:bg-gray-800 p-6 text-left align-middle shadow-xl transition-all">
                                <Dialog.Title as="h3" className="text-lg font-medium leading-6 text-gray-900 dark:text-white">
                                    API Key Created Successfully
                                </Dialog.Title>
                                <div className="mt-2">
                                    <p className="text-sm text-red-600 dark:text-red-400 font-semibold">
                                        Please copy your new API key. You won't be able to see it again!
                                    </p>
                                     <p className="text-sm text-gray-600 dark:text-gray-300 mt-3">
                                        Key Name: <span className="font-medium text-gray-900 dark:text-white">{apiKeyData.name}</span>
                                     </p>
                                     <p className="text-sm text-gray-600 dark:text-gray-300">
                                        Key Prefix: <span className="font-medium text-gray-900 dark:text-white font-mono">{apiKeyData.prefix}...</span>
                                     </p>
                                </div>

                                 <div className="mt-4 p-3 bg-gray-100 dark:bg-gray-900 rounded border border-gray-300 dark:border-gray-700 flex items-center justify-between">
                                      <code className="text-sm text-gray-700 dark:text-gray-200 break-all font-mono select-all">
                                          {apiKeyData.full_key}
                                      </code>
                                      <button
                                          onClick={copyToClipboard}
                                          title="Copy to clipboard"
                                          className="ml-4 p-1 rounded text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                      >
                                          {copied ? (
                                              <CheckCircleIcon className="h-5 w-5 text-green-500" />
                                          ) : (
                                              <ClipboardDocumentIcon className="h-5 w-5" />
                                          )}
                                      </button>
                                 </div>


                                <div className="mt-6 flex justify-end">
                                    <button
                                        type="button"
                                        className="inline-flex justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2"
                                        onClick={onClose}
                                    >
                                        Close
                                    </button>
                                </div>
                            </Dialog.Panel>
                        </Transition.Child>
                    </div>
                </div>
            </Dialog>
        </Transition>
    );
};

export default ShowApiKeyModal;
