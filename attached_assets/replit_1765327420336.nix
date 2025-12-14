{ pkgs }: {
  deps = [
    pkgs.python311Full
    pkgs.python311Packages.pip
    pkgs.python311Packages.setuptools
    pkgs.python311Packages.wheel
    pkgs.chromium
    pkgs.chromedriver
    pkgs.xvfb-run
    pkgs.nodejs_18
    pkgs.nodePackages.npm
    pkgs.sqlite
  ];
  
  env = {
    PYTHON_LD_LIBRARY_PATH = pkgs.lib.makeLibraryPath [
      pkgs.stdenv.cc.cc.lib
      pkgs.zlib
      pkgs.glib
      pkgs.xorg.libX11
      pkgs.xorg.libXext
      pkgs.xorg.libXtst
      pkgs.xorg.libXi
      pkgs.xorg.libXrandr
      pkgs.xorg.libXcomposite
      pkgs.xorg.libXdamage
      pkgs.xorg.libXfixes
      pkgs.xorg.libxcb
      pkgs.xorg.libXScrnSaver
      pkgs.nss
      pkgs.nspr
      pkgs.atk
      pkgs.at-spi2-atk
      pkgs.gtk3
      pkgs.gdk-pixbuf
      pkgs.cairo
      pkgs.pango
      pkgs.dbus
      pkgs.expat
      pkgs.fontconfig
      pkgs.freetype
      pkgs.libuuid
      pkgs.cups
    ];
    
    PYTHONHTTPSVERIFY = 0;
    PYTHONPATH = "$PWD";
    DISPLAY = ":99";
    CHROME_BIN = "${pkgs.chromium}/bin/chromium";
    CHROMEDRIVER_PATH = "${pkgs.chromedriver}/bin/chromedriver";
  };
}