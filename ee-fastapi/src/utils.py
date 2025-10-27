import os
import re
import logging
from pathlib import Path
from typing import List, Optional
import ee

logger = logging.getLogger(__name__)

def load_credentials() -> bool:
    """Load Earth Engine credentials from environment."""
    try:
        ee_token = os.environ.get('EARTHENGINE_TOKEN')
        if not ee_token:
            logger.warning("EARTHENGINE_TOKEN not found in environment")
            return False
            
        credential = f'{{"refresh_token":"{ee_token}"}}'
        credential_file_path = Path.home() / ".config" / "earthengine"
        credential_file_path.mkdir(parents=True, exist_ok=True)
        
        with open(credential_file_path / 'credentials', 'w') as file:
            file.write(credential)
        return True
    except Exception as e:
        logger.error(f"Failed to load credentials: {str(e)}")
        return False


def replace_line(file_name: str, line_num: int, text: str) -> bool:
    """Replace a specific line in a file.

    Args:
        file_name: Path to file
        line_num: Line number to replace (0-indexed)
        text: New text for the line

    Returns:
        True if successful
        
    Raises:
        FileNotFoundError: If file doesn't exist
        IndexError: If line_num is out of range
    """
    try:
        file_path = Path(file_name)
        if not file_path.exists():
            raise FileNotFoundError(f"File not found: {file_name}")
            
        with open(file_path, 'r') as f:
            lines = f.readlines()
            
        if line_num >= len(lines):
            raise IndexError(f"Line {line_num} out of range (file has {len(lines)} lines)")
            
        lines[line_num] = text if text.endswith('\n') else text + '\n'
        
        with open(file_path, 'w') as f:
            f.writelines(lines)
        return True
    except Exception as e:
        logger.error(f"Error replacing line in {file_name}: {str(e)}")
        raise

def searching_all_files(path: str = ".", pattern: str = r"\.tiff$|\.csv$") -> List[str]:
    """Recursively search for files matching pattern.
    
    Args:
        path: Directory path to search
        pattern: Regex pattern to match filenames
        
    Returns:
        List of absolute file paths
    """
    try:
        dirpath = Path(path)
        if not dirpath.is_dir():
            raise ValueError(f"Path is not a directory: {path}")
            
        file_list = []
        for item in dirpath.iterdir():
            if item.is_file() and re.search(pattern, item.as_posix()):
                file_list.append(item.absolute().as_posix())
            elif item.is_dir():
                file_list.extend(searching_all_files(str(item), pattern))
        return file_list
    except Exception as e:
        logger.error(f"Error searching files in {path}: {str(e)}")
        return []

def raster_to_vector(image: ee.Image, geom: ee.Geometry) -> dict:
    """Convert raster image to vector features.
    
    Args:
        image: Earth Engine image
        geom: Geometry for vectorization
        
    Returns:
        GeoJSON feature collection
    """
    try:
        vector_img = image.unmask(0).reduceToVectors(
            geometry=geom,
            scale=10,
            bestEffort=True,
            maxPixels=1e8
        )
        return vector_img.getInfo()
    except Exception as e:
        logger.error(f"Error converting raster to vector: {str(e)}")
        raise