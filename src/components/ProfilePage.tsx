import React, { useState } from 'react';
import { User, Settings, CreditCard, Shield, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Button, Input } from './ui';
import { ProtectedRoute } from './auth';

const SUBSCRIPTION_PLANS = [
  {
    id: 'pro',
    name: 'Pro',
    price: 2.99,
    currency: 'EUR',
    interval: 'month' as const,
    features: [
      'Onbeperkte toegang tot alle feitcodes',
      'Prioriteit ondersteuning',
      'Geavanceerde zoekfuncties',
      'Export mogelijkheden'
    ]
  }
];

const ProfilePage: React.FC = () => {
  const { 
    user, 
    updateProfile, 
    changePassword, 
    subscribe, 
    cancelSubscription,
    isSubscriber,
    refreshUser
  } = useAuth();
  
  const [activeTab, setActiveTab] = useState<'profile' | 'subscription' | 'security'>('profile');
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setSaving] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  // Form states
  const [profileForm, setProfileForm] = useState({
    full_name: user?.full_name || '',
    email: user?.email || '',
  });
  
  const [passwordForm, setPasswordForm] = useState({
    newPassword: '',
    confirmPassword: '',
  });

  const handleProfileSave = async () => {
    if (!user) return;
    
    setSaving(true);
    try {
      await updateProfile({
        full_name: profileForm.full_name,
        email: profileForm.email,
      });
      setIsEditing(false);
      await refreshUser();
    } catch (error) {
      console.error('Error updating profile:', error);
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async () => {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      alert('Wachtwoorden komen niet overeen');
      return;
    }
    
    if (passwordForm.newPassword.length < 6) {
      alert('Wachtwoord moet minimaal 6 karakters lang zijn');
      return;
    }

    setSaving(true);
    try {
      await changePassword(passwordForm.newPassword);
      setPasswordForm({ newPassword: '', confirmPassword: '' });
    } catch (error) {
      console.error('Error changing password:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleSubscribe = async (planId: string) => {
    setSaving(true);
    try {
      await subscribe(planId);
      await refreshUser();
    } catch (error) {
      console.error('Error subscribing:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleCancelSubscription = async () => {
    setSaving(true);
    try {
      await cancelSubscription();
      await refreshUser();
      setShowCancelConfirm(false);
    } catch (error) {
      console.error('Error cancelling subscription:', error);
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Onbekend';
    return new Date(dateString).toLocaleDateString('nl-NL', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getRoleDisplay = (role: string) => {
    const roleMap = {
      user: 'Gebruiker',
      subscriber: 'Abonnee',
      moderator: 'Moderator',
      administrator: 'Administrator'
    };
    return roleMap[role as keyof typeof roleMap] || role;
  };

  const getRoleBadgeColor = (role: string) => {
    const colorMap = {
      user: 'bg-gray-100 text-gray-800',
      subscriber: 'bg-blue-100 text-blue-800',
      moderator: 'bg-yellow-100 text-yellow-800',
      administrator: 'bg-red-100 text-red-800'
    };
    return colorMap[role as keyof typeof colorMap] || 'bg-gray-100 text-gray-800';
  };

  if (!user) {
    return <div>Loading...</div>;
  }

  return (
    <ProtectedRoute>
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-md">
          {/* Header */}
          <div className="border-b border-gray-200 px-6 py-4">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-[#ec0000] text-white rounded-full flex items-center justify-center">
                <User className="w-8 h-8" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-800">
                  {user.full_name || 'Gebruiker'}
                </h1>
                <p className="text-gray-600">{user.email}</p>
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium mt-1 ${getRoleBadgeColor(user.role)}`}>
                  <Shield className="w-3 h-3 mr-1" />
                  {getRoleDisplay(user.role)}
                </span>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              {[
                { id: 'profile', label: 'Profiel', icon: User },
                { id: 'subscription', label: 'Abonnement', icon: CreditCard },
                { id: 'security', label: 'Beveiliging', icon: Settings },
              ].map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setActiveTab(id as any)}
                  className={`flex items-center space-x-2 py-4 border-b-2 font-medium text-sm ${
                    activeTab === id
                      ? 'border-[#ec0000] text-[#ec0000]'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{label}</span>
                </button>
              ))}
            </nav>
          </div>

          {/* Content */}
          <div className="p-6">
            {activeTab === 'profile' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h2 className="text-lg font-semibold text-gray-800">Profiel Informatie</h2>
                  {!isEditing ? (
                    <Button
                      variant="secondary"
                      onClick={() => setIsEditing(true)}
                    >
                      Bewerken
                    </Button>
                  ) : (
                    <div className="flex space-x-2">
                      <Button
                        variant="secondary"
                        onClick={() => {
                          setIsEditing(false);
                          setProfileForm({
                            full_name: user.full_name || '',
                            email: user.email || '',
                          });
                        }}
                      >
                        Annuleren
                      </Button>
                      <Button
                        onClick={handleProfileSave}
                        isLoading={isSaving}
                      >
                        Opslaan
                      </Button>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Input
                    label="Volledige naam"
                    value={isEditing ? profileForm.full_name : user.full_name || ''}
                    onChange={(e) => setProfileForm({ ...profileForm, full_name: e.target.value })}
                    disabled={!isEditing}
                  />
                  <Input
                    label="E-mailadres"
                    type="email"
                    value={isEditing ? profileForm.email : user.email}
                    onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                    disabled={!isEditing}
                  />
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-medium text-gray-800 mb-2">Account Details</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Aangemaakt op:</span>
                      <p className="font-medium">{formatDate(user.created_at)}</p>
                    </div>
                    <div>
                      <span className="text-gray-600">Laatst bijgewerkt:</span>
                      <p className="font-medium">{formatDate(user.updated_at)}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'subscription' && (
              <div className="space-y-6">
                <h2 className="text-lg font-semibold text-gray-800">Abonnement</h2>

                {isSubscriber ? (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-semibold text-green-800">
                          {user.subscription_plan || 'Pro'} Abonnement
                        </h3>
                        <p className="text-green-600">Actief</p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-green-800">€2,99</p>
                        <p className="text-sm text-green-600">per maand</p>
                      </div>
                    </div>
                    
                    {user.subscription_expires_at && (
                      <p className="text-sm text-green-700 mb-4">
                        Verlengt automatisch op {formatDate(user.subscription_expires_at)}
                      </p>
                    )}

                    <div className="flex justify-end">
                      <Button
                        variant="secondary"
                        onClick={() => setShowCancelConfirm(true)}
                      >
                        Abonnement opzeggen
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <p className="text-gray-600">
                      Upgrade naar Premium voor toegang tot alle functies.
                    </p>
                    
                    {SUBSCRIPTION_PLANS.map((plan) => (
                      <div key={plan.id} className="border border-gray-200 rounded-lg p-6">
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <h3 className="text-lg font-semibold text-gray-800">{plan.name}</h3>
                            <p className="text-gray-600">Maandelijks abonnement</p>
                          </div>
                          <div className="text-right">
                            <p className="text-2xl font-bold text-gray-800">€{plan.price}</p>
                            <p className="text-sm text-gray-600">per {plan.interval === 'month' ? 'maand' : 'jaar'}</p>
                          </div>
                        </div>

                        <ul className="space-y-2 mb-6">
                          {plan.features.map((feature, index) => (
                            <li key={index} className="flex items-center text-sm text-gray-600">
                              <div className="w-2 h-2 bg-[#ec0000] rounded-full mr-3"></div>
                              {feature}
                            </li>
                          ))}
                        </ul>

                        <Button
                          onClick={() => handleSubscribe(plan.id)}
                          isLoading={isSaving}
                          className="w-full"
                        >
                          Abonneren voor €{plan.price}/maand
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'security' && (
              <div className="space-y-6">
                <h2 className="text-lg font-semibold text-gray-800">Beveiliging</h2>

                <div className="bg-white border border-gray-200 rounded-lg p-6">
                  <h3 className="text-md font-semibold text-gray-800 mb-4">Wachtwoord wijzigen</h3>
                  
                  <div className="space-y-4">
                    <div className="relative">
                      <Input
                        label="Nieuw wachtwoord"
                        type={showPassword ? 'text' : 'password'}
                        value={passwordForm.newPassword}
                        onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                        placeholder="Voer nieuw wachtwoord in"
                        className="pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-9 text-gray-400 hover:text-gray-600"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>

                    <Input
                      label="Bevestig nieuw wachtwoord"
                      type={showPassword ? 'text' : 'password'}
                      value={passwordForm.confirmPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                      placeholder="Bevestig nieuw wachtwoord"
                    />

                    <Button
                      onClick={handlePasswordChange}
                      isLoading={isSaving}
                      disabled={!passwordForm.newPassword || !passwordForm.confirmPassword}
                    >
                      Wachtwoord wijzigen
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Cancel Subscription Confirmation Modal */}
        {showCancelConfirm && (
          <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">
                Abonnement opzeggen
              </h3>
              <p className="text-gray-600 mb-6">
                Weet je zeker dat je je abonnement wilt opzeggen? Je verliest toegang tot alle premium functies.
              </p>
              <div className="flex justify-end space-x-3">
                <Button
                  variant="secondary"
                  onClick={() => setShowCancelConfirm(false)}
                >
                  Nee, behouden
                </Button>
                <Button
                  onClick={handleCancelSubscription}
                  isLoading={isSaving}
                >
                  Ja, opzeggen
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
};

export default ProfilePage;