param(
    [Parameter(Mandatory = $true)]
    [string]$PrinterName,

    [Parameter(Mandatory = $true)]
    [string]$FilePath
)

$ErrorActionPreference = "Stop"

# ============================================================
# RAW WINDOWS PRINTER API
# ============================================================

Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;

public static class MarketBazaRawPrinter
{
    [StructLayout(
        LayoutKind.Sequential,
        CharSet = CharSet.Unicode
    )]
    public class DOC_INFO_1
    {
        [MarshalAs(UnmanagedType.LPWStr)]
        public string pDocName;

        [MarshalAs(UnmanagedType.LPWStr)]
        public string pOutputFile;

        [MarshalAs(UnmanagedType.LPWStr)]
        public string pDatatype;
    }

    // --------------------------------------------------------
    // OpenPrinter
    // --------------------------------------------------------

    [DllImport(
        "winspool.drv",
        EntryPoint = "OpenPrinterW",
        SetLastError = true,
        CharSet = CharSet.Unicode
    )]
    public static extern bool OpenPrinter(
        string pPrinterName,
        out IntPtr phPrinter,
        IntPtr pDefault
    );

    // --------------------------------------------------------
    // ClosePrinter
    // --------------------------------------------------------

    [DllImport(
        "winspool.drv",
        EntryPoint = "ClosePrinter",
        SetLastError = true
    )]
    public static extern bool ClosePrinter(
        IntPtr hPrinter
    );

    // --------------------------------------------------------
    // StartDocPrinter
    // --------------------------------------------------------

    [DllImport(
        "winspool.drv",
        EntryPoint = "StartDocPrinterW",
        SetLastError = true,
        CharSet = CharSet.Unicode
    )]
    public static extern int StartDocPrinter(
        IntPtr hPrinter,
        int Level,
        [In] DOC_INFO_1 pDocInfo
    );

    // --------------------------------------------------------
    // EndDocPrinter
    // --------------------------------------------------------

    [DllImport(
        "winspool.drv",
        EntryPoint = "EndDocPrinter",
        SetLastError = true
    )]
    public static extern bool EndDocPrinter(
        IntPtr hPrinter
    );

    // --------------------------------------------------------
    // StartPagePrinter
    // --------------------------------------------------------

    [DllImport(
        "winspool.drv",
        EntryPoint = "StartPagePrinter",
        SetLastError = true
    )]
    public static extern bool StartPagePrinter(
        IntPtr hPrinter
    );

    // --------------------------------------------------------
    // EndPagePrinter
    // --------------------------------------------------------

    [DllImport(
        "winspool.drv",
        EntryPoint = "EndPagePrinter",
        SetLastError = true
    )]
    public static extern bool EndPagePrinter(
        IntPtr hPrinter
    );

    // --------------------------------------------------------
    // WritePrinter
    // --------------------------------------------------------

    [DllImport(
        "winspool.drv",
        EntryPoint = "WritePrinter",
        SetLastError = true
    )]
    public static extern bool WritePrinter(
        IntPtr hPrinter,
        IntPtr pBytes,
        int dwCount,
        out int dwWritten
    );

    // ========================================================
    // SEND RAW BYTES
    // ========================================================

    public static void SendBytes(
        string printerName,
        byte[] bytes
    )
    {
        IntPtr printerHandle =
            IntPtr.Zero;

        // ----------------------------------------------------
        // Printerni ochish
        // ----------------------------------------------------

        bool opened =
            OpenPrinter(
                printerName,
                out printerHandle,
                IntPtr.Zero
            );

        if (!opened)
        {
            int error =
                Marshal.GetLastWin32Error();

            throw new Exception(
                "OpenPrinter xatosi. " +
                "Windows error code: " +
                error
            );
        }

        try
        {
            // ------------------------------------------------
            // RAW document
            // ------------------------------------------------

            DOC_INFO_1 document =
                new DOC_INFO_1();

            document.pDocName =
                "MarketBaza Receipt";

            document.pOutputFile =
                null;

            document.pDatatype =
                "RAW";

            // ------------------------------------------------
            // Start document
            // ------------------------------------------------

            int jobId =
                StartDocPrinter(
                    printerHandle,
                    1,
                    document
                );

            if (jobId == 0)
            {
                int error =
                    Marshal.GetLastWin32Error();

                throw new Exception(
                    "StartDocPrinter xatosi. " +
                    "Windows error code: " +
                    error
                );
            }

            try
            {
                // --------------------------------------------
                // Start page
                // --------------------------------------------

                bool pageStarted =
                    StartPagePrinter(
                        printerHandle
                    );

                if (!pageStarted)
                {
                    int error =
                        Marshal.GetLastWin32Error();

                    throw new Exception(
                        "StartPagePrinter xatosi. " +
                        "Windows error code: " +
                        error
                    );
                }

                try
                {
                    // ----------------------------------------
                    // Unmanaged memory
                    // ----------------------------------------

                    IntPtr unmanagedBytes =
                        Marshal.AllocCoTaskMem(
                            bytes.Length
                        );

                    try
                    {
                        // ------------------------------------
                        // Copy bytes
                        // ------------------------------------

                        Marshal.Copy(
                            bytes,
                            0,
                            unmanagedBytes,
                            bytes.Length
                        );

                        // ------------------------------------
                        // Write
                        // ------------------------------------

                        int written;

                        bool success =
                            WritePrinter(
                                printerHandle,
                                unmanagedBytes,
                                bytes.Length,
                                out written
                            );

                        if (!success)
                        {
                            int error =
                                Marshal.GetLastWin32Error();

                            throw new Exception(
                                "WritePrinter xatosi. " +
                                "Windows error code: " +
                                error
                            );
                        }

                        // ------------------------------------
                        // Written bytes check
                        // ------------------------------------

                        if (
                            written !=
                            bytes.Length
                        )
                        {
                            throw new Exception(
                                "Printerga barcha " +
                                "ma'lumot yuborilmadi. " +
                                "Yuborildi: " +
                                written +
                                " / " +
                                bytes.Length
                            );
                        }
                    }
                    finally
                    {
                        // ------------------------------------
                        // Free memory
                        // ------------------------------------

                        Marshal.FreeCoTaskMem(
                            unmanagedBytes
                        );
                    }
                }
                finally
                {
                    // ----------------------------------------
                    // End page
                    // ----------------------------------------

                    EndPagePrinter(
                        printerHandle
                    );
                }
            }
            finally
            {
                // ------------------------------------------------
                // End document
                // ------------------------------------------------

                EndDocPrinter(
                    printerHandle
                );
            }
        }
        finally
        {
            // ----------------------------------------------------
            // Close printer
            // ----------------------------------------------------

            ClosePrinter(
                printerHandle
            );
        }
    }
}

"@

# ============================================================
# FILE CHECK
# ============================================================

if (-not (Test-Path -LiteralPath $FilePath)) {
    throw (
        "RAW fayl topilmadi: " +
        $FilePath
    )
}

# ============================================================
# READ RAW FILE
# ============================================================

$bytes =
    [System.IO.File]::ReadAllBytes(
        $FilePath
    )

if (
    $null -eq $bytes -or
    $bytes.Length -eq 0
) {
    throw "RAW fayl bo‘sh."
}

# ============================================================
# SEND TO PRINTER
# ============================================================

[MarketBazaRawPrinter]::SendBytes(
    $PrinterName,
    $bytes
)

# ============================================================
# SUCCESS
# ============================================================

Write-Output (
    "OK - " +
    $bytes.Length +
    " bytes printerga yuborildi."
)