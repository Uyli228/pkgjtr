// Підписує APK схемою v2 бібліотекою apksig (Android 7.0+).
import com.android.apksig.ApkSigner;
import com.android.apksig.ApkVerifier;
import java.io.File;
import java.io.FileInputStream;
import java.security.KeyStore;
import java.security.PrivateKey;
import java.security.cert.X509Certificate;
import java.util.Collections;

public class Sign {
  public static void main(String[] a) throws Exception {
    // a: keystore password alias in out
    KeyStore ks = KeyStore.getInstance("PKCS12");
    try (FileInputStream f = new FileInputStream(a[0])) { ks.load(f, a[1].toCharArray()); }
    PrivateKey key = (PrivateKey) ks.getKey(a[2], a[1].toCharArray());
    X509Certificate cert = (X509Certificate) ks.getCertificate(a[2]);
    ApkSigner.SignerConfig sc = new ApkSigner.SignerConfig.Builder("ck", key, Collections.singletonList(cert)).build();
    new ApkSigner.Builder(Collections.singletonList(sc))
        .setInputApk(new File(a[3])).setOutputApk(new File(a[4]))
        .setV1SigningEnabled(false).setV2SigningEnabled(true)
        .setMinSdkVersion(24)
        .build().sign();
    ApkVerifier.Result r = new ApkVerifier.Builder(new File(a[4])).build().verify();
    System.out.println("verified=" + r.isVerified() + " v1=" + r.isVerifiedUsingV1Scheme() + " v2=" + r.isVerifiedUsingV2Scheme());
    if (!r.isVerified()) {
      System.out.println(r.getErrors());
      System.exit(1);
    }
  }
}
