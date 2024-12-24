using Autodesk.Forge;
using designautomationbootcamp;

InternalOAuth.cs
using Autodesk.Forge;
using System;
using System.Threading.Tasks;

namespace designautomationbootcamp // ajusta tu namespace
{
    public static class InternalOAuth
    {
        private static dynamic _internalToken;
        private static DateTime _expireAt;

        public static async Task<dynamic> GetInternalAsync()
        {
            if (_internalToken == null || DateTime.Now >= _expireAt)
            {
                string clientId = GetAppSetting("APS_CLIENT_ID");
                string clientSecret = GetAppSetting("APS_CLIENT_SECRET");
                if (string.IsNullOrEmpty(clientId) || string.IsNullOrEmpty(clientSecret))
                    throw new Exception("Faltan APS_CLIENT_ID / APS_CLIENT_SECRET.");

                TwoLeggedApi oauth = new TwoLeggedApi();
                dynamic bearer = await oauth.AuthenticateAsync(
                    clientId,
                    clientSecret,
                    "client_credentials",
                    new Scope[]
                    {
                        Scope.BucketCreate, Scope.BucketRead, Scope.BucketDelete,
                        Scope.DataRead, Scope.DataWrite, Scope.DataCreate,
                        Scope.CodeAll
                    }
                );
                _internalToken = bearer;
                _expireAt = DateTime.Now.AddSeconds((double)bearer.expires_in);
            }
            return _internalToken;
        }

        public static string GetAppSetting(string key)
        {
            string val = Environment.GetEnvironmentVariable(key);
            if (!string.IsNullOrEmpty(val)) return val;

            // O leer appsettings.json
            // ...
            return null;
        }
    }
}