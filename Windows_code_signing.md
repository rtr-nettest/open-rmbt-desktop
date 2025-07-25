# Open RMBT Desktop - Windows App Code Signing for Microsoft Store

Microsoft requires apps to be signed with a valid code signing certificate (resp. the corresponding private key) that chains up to a certificate issued by a *Certificate Authority (CA)* that is part of the [*Microsoft Trusted Root Program*](https://learn.microsoft.com/en-us/security/trusted-root/participants-list) (cf. [Appendix](#microsoft-store-requirements)). 

## Code Signing certificate creation and activation

In this documentation we assume possession of a [_Certum_](https://www.certum.eu/en/) code signing certificate, where Certum is a vendor trusted by Microsoft. 

The Certum code signing certificate can be managed and activated in their [_Certmanager_ webinterface](https://certmanager.certum.pl/). Certum provides a manual on [_EV Code Signing on a card certificate activation_](https://files.certum.eu/documents/manual_en/CS-EV_Code_Signing_Certificate_activation.pdf). 

Certificate activation requires
- Installation of _"proCertum CardManager"_ (Windows v4.12.0, status 18.07.2025): ​https://support.certum.eu/en/cert-offer-card-manager/
- Installation of _"Certum SignService"_ (Windows v2.1.45, status 18.07.2025): ​https://files.certum.eu/software/CertumSignService/Windows/2.1.45/
- The cryptoCertum Smartcard inserted into the USB reader, the reader connected to the computer and the card itself has an initialized common profile with a PIN code set.

Example code signing certificate after creation:
```
EnhancedKeyUsageList : {Codesignatur (1.3.6.1.5.5.7.3.3)}
DnsNameList          : {Rundfunk und Telekom Regulierungs-GmbH (RTR-GmbH)}
SendAsTrustedIssuer  : False
Archived             : False
Extensions           : {System.Security.Cryptography.Oid, System.Security.Cryptography.Oid,
                       System.Security.Cryptography.Oid, System.Security.Cryptography.Oid...}
FriendlyName         :
IssuerName           : System.Security.Cryptography.X509Certificates.X500DistinguishedName
NotAfter             : 06.07.2028 13:25:49
NotBefore            : 07.07.2025 13:25:50
HasPrivateKey        : False
PrivateKey           :
PublicKey            : System.Security.Cryptography.X509Certificates.PublicKey
RawData              : {48, 130, 7, 67...}
SerialNumber         : 59549E708A213FAD8ABEEADAF989FE1D
SubjectName          : System.Security.Cryptography.X509Certificates.X500DistinguishedName
SignatureAlgorithm   : System.Security.Cryptography.Oid
Thumbprint           : D859CDCDF0F2A3BBE8159B2CEEF29BA23CE9B4A8
Version              : 3
Handle               : 2608334490720
Issuer               : CN=Certum Extended Validation Code Signing 2021 CA, O=Asseco Data Systems S.A., C=PL
Subject              : CN=Rundfunk und Telekom Regulierungs-GmbH (RTR-GmbH), O=Rundfunk und Telekom Regulierungs-GmbH
                       (RTR-GmbH), STREET=Mariahilfer Straße 77-79, PostalCode=1060, L=Wien, S=Wien, C=AT,
                       SERIALNUMBER=FN208312t, OID.1.3.6.1.4.1.311.60.2.1.1=Wien, OID.1.3.6.1.4.1.311.60.2.1.2=Wien,
                       OID.1.3.6.1.4.1.311.60.2.1.3=AT, OID.2.5.4.15=Private Organization
```

## Sign an app using `SignTool`

Certum provides a manual for [code signing using `SignTool` and `Jarsigner`](https://www.files.certum.eu/documents/manual_en/Code-Signing-signing-the-code-using-tools-like-Singtool-and-Jarsigner_v2.3.pdf). 

Prerequisites:
- Installation of `SignTool` resp. Windows SDK as SignTool is available as part of the Windows Software Development Kit (SDK) (cf. [Appendix](#windows-appbinary-code-signatures-resp-microsoft-signtool))
- Inserted cryptoCertum Smartcard (USB reader)

### Code Signature Creation with `signtool.exe`

`signtool sign /n "[1] " / t [2] /fd [3] /v [4`

- > [1] – Name or part of the name of the certificate's owner, which can be checked in the proCertum CardManager application or in the system tool certmgr.msc:
    - e.g. `Rundfunk und Telekom Regulierungs-GmbH (RTR-GmbH)`
- >  [2] – Timestamp Address. For Certum: http://time.certum.pl
    - e.g. `http://time.certum.pl`
- > [3] – The name of the signature algorithm. Available sha1 and sha256
    - e.g. `sha256`
- > [4] – The path to the file to be signed	

Entering the smartcard PIN code once is necessary during the signing operation.

- Certum Examples:
    - `signtool sign /n "Asseco Data Systems S.A." /t http://time.certum.pl/ /fd sha1 /v aplikacja.exe`
    - `signtool sign /n "Asseco Data Systems S.A." /t http://time.certum.pl/ /fd sha256 /v aplikacja.exe`

### Code Signature Verification with `signtool.exe`:

`signtool verify /pa [1]`

- > [1] – The name of the signed file

- Certum Example Signatur Verifikation:
    - `signtool verify /pa aplikacja.exe`

## App Publication in Microsoft Store

- Upload signed app binary somewhere with public access (e.g. `https://microsoft.com/downloads/1.1/myinstaller.msi`)
- Login to Microsoft account: ​https://partner.microsoft.com/dashboard/apps-and-games/overview 
- Select app
- Update app -> Packages
- Add package
    - Enter URL of binary, x64, parameters, "installer runs silent", German & English, EXE
    - Installer handling: https://www.electron.build/configuration/squirrel-windows.html
    - Save draft
    - Delete old package 
    - Save all, _wait_, Next
    - Submit
- Success status is "_update in review_"
- Wait for up to 3 business days :-) for publication in Microsoft Store (e.g. [RTR-Netztest App](​https://apps.microsoft.com/store/detail/XP9K0TF8QNZSPV))

## Appendix

### Microsoft Store Requirements

- [App package requirements for MSI/EXE app](https://learn.microsoft.com/en-us/windows/apps/publish/publish-your-app/msi/app-package-requirements)
- [Microsoft Store Policies](https://learn.microsoft.com/en-us/windows/apps/publish/store-policies)
- [The app certification process for MSI/EXE app](https://learn.microsoft.com/en-us/windows/apps/publish/publish-your-app/msi/app-certification-process)
- [Reddit: A guide to code signing certificates for the Microsoft app store and a question for the experts ](https://www.reddit.com/r/electronjs/comments/17sizjf/a_guide_to_code_signing_certificates_for_the/)

### Windows app/binary code signatures resp. Microsoft `SignTool`

- [Manage code signing certificates](https://learn.microsoft.com/en-us/windows-hardware/drivers/dashboard/code-signing-cert-manage#get-or-renew-a-code-signing-certificate)
- [Sign your app for Smart App Control compliance](https://learn.microsoft.com/en-us/windows/apps/develop/smart-app-control/code-signing-for-smart-app-control)
- [`SignTool`](https://learn.microsoft.com/en-us/windows/win32/seccrypto/signtool)
- [How to sign an app package using SignTool](https://learn.microsoft.com/en-us/windows/win32/appxpkg/how-to-sign-a-package-using-signtool)
